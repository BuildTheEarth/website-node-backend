import { Request, Response } from "express";
import turf, {
  CoordinateType,
  parseCoordinates,
  toOverpassPolygon,
  toPolygon,
} from "../util/Coordinates.js";
import {
  ERROR_GENERIC,
  ERROR_NO_PERMISSION,
  ERROR_VALIDATION,
} from "../util/Errors.js";

import { Claim } from "@prisma/client";
import axios from "axios";
import { validationResult } from "express-validator";
import Core from "../Core.js";

class ClaimController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getClaims(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const filters = {
      finished: req.query.finished ? req.query.finished === "true" : undefined,
      active: req.query.active ? req.query.active === "true" : undefined,
      team: req.query.team ? (req.query.team as string) : undefined,
    };

    const claims = await this.core.getPrisma().claim.findMany({
      where: {
        finished: filters.finished,
        active: filters.active,
        buildTeam: req.query.slug
          ? { slug: filters.team }
          : { id: filters.team },
      },
    });

    res.send(claims);
  }

  public async getClaimsGeoJson(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const filters = {
      finished: req.query.finished ? req.query.finished === "true" : undefined,
      active: req.query.active ? req.query.active === "true" : undefined,
    };

    const claims = await this.core.getPrisma().claim.findMany({
      where: { finished: filters.finished, active: filters.active },
      select: { id: true, area: true, finished: true },
    });

    res.send({
      type: "FeatureCollection",
      features: claims.map((c) => {
        const mapped = c.area?.map((p: string) => p.split(", ").map(Number));
        return {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [mapped],
          },
          properties: { ...c, area: undefined },
          id: c.id,
        };
      }),
    });
  }

  public async getClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }
    const claim = await this.core.getPrisma().claim.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        owner: true,
        buildTeam: {
          select: {
            name: true,
            id: true,
            location: true,
            slug: true,
            icon: true,
            allowBuilderClaim: true,
          },
        },
        builders: req.query.builders
          ? {
              select: {
                ssoId: true,
                id: true,
                discordId: true,
                name: true,
                avatar: true,
              },
              take: 10,
            }
          : undefined,
        _count: { select: { builders: true } },
      },
    });
    if (claim) {
      const kcBuilders = await Promise.all(
        claim.builders?.map(async (member) => {
          const kcMember = await this.core
            .getKeycloakAdmin()
            .getKeycloakAdminClient()
            .users.findOne({
              id: member.ssoId,
            });
          return {
            discordId: member.discordId,
            id: member.id,
            username: kcMember?.username,
            avatar: member.avatar,
            name: member.name,
          };
        })
      );

      let kcOwner;
      if (claim.owner) {
        kcOwner = await this.core
          .getKeycloakAdmin()
          .getKeycloakAdminClient()
          .users.findOne({
            id: claim.owner.ssoId,
          });
      }

      res.send({
        ...claim,
        builders: kcBuilders,
        owner: { ...claim.owner, username: kcOwner?.username },
      });
    } else {
      ERROR_GENERIC(res, 404, "Claim does not exist.");
    }
    return;
  }

  public async updateClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const { name, finished, active, area, description } = req.body;
    const claim = await this.core.getPrisma().claim.update({
      where: {
        id: req.params.id,
      },
      data: {
        name,
        description,
        finished,
        active,
        area: area,
        center: turf.center(toPolygon(area)).geometry.coordinates.join(", "),
        builders: req.body.builders
          ? { set: req.body.builders.map((b: any) => ({ id: b.id })) }
          : undefined,
        buildings: area && (await this.updateClaimBuildingCount({ area })),
      },
    });

    this.core.getDiscord().sendClaimUpdate(claim);
    res.send({
      ...claim,
      builders: req.body.builders.map((b: any) => ({ ...b, new: false })),
    });
  }

  public async createClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: req.query.slug ? { slug: req.body.team } : { id: req.body.team },
      select: {
        allowBuilderClaim: true,
        id: true,
        members: { where: { id: req.user.id } },
      },
    });

    if (buildteam.allowBuilderClaim === false) {
      return ERROR_GENERIC(res, 403, "BuildTeam does not allow Claims.");
    }

    if (buildteam.members.length <= 0) {
      return ERROR_GENERIC(res, 403, "You are not a member of this BuildTeam.");
    }

    const area = req.body.area?.map((p: [number, number]) => p.join(", "));

    const claim = await this.core.getPrisma().claim.create({
      data: {
        buildTeam: {
          connect: {
            id: buildteam.id,
          },
        },
        area: area,
        center:
          area && turf.center(toPolygon(area)).geometry.coordinates.join(", "),
        owner: { connect: { id: req.user.id } },
        builders: req.body.builders
          ? { connect: req.body.builders.map((b: any) => ({ area })) }
          : undefined,
        name: req.body.name,
        description: req.body.description,
        finished: req.body.finished,
        active: req.body.active,
        buildings: area && (await this.updateClaimBuildingCount({ area })),
      },
    });

    res.send(claim);
  }

  public async deleteClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    if (!req.user) {
      return ERROR_NO_PERMISSION(res);
    }
    let claim = null;

    if (req.params.team) {
      claim = await this.core.getPrisma().claim.findFirst({
        where: {
          id: req.params.id,
          buildTeam: req.query.slug
            ? { slug: req.params.team }
            : { id: req.params.team },
        },
      });
    } else {
      claim = await this.core.getPrisma().claim.findFirst({
        where: {
          id: req.params.id,
          ownerId: req.user.id,
        },
      });
    }
    console.log(claim);

    if (claim) {
      await this.core.getPrisma().claim.delete({
        where: {
          id: req.params.id,
        },
      });
      res.send(claim);
    } else {
      ERROR_GENERIC(res, 404, "Claim does not exist.");
    }
  }

  public async updateClaimBuildingCount(
    claim: {
      id?: string;
      area: string[];
    },
    update?: boolean
  ) {
    const polygon = toOverpassPolygon(claim.area);

    const overpassQuery = `[out:json][timeout:25];
        (
          node["building"]["building"!~"grandstand"]["building"!~"roof"]["building"!~"garage"]["building"!~"hut"]["building"!~"shed"](poly: "${polygon}");
          way["building"]["building"!~"grandstand"]["building"!~"roof"]["building"!~"garage"]["building"!~"hut"]["building"!~"shed"](poly: "${polygon}");
          relation["building"]["building"!~"grandstand"]["building"!~"roof"]["building"!~"garage"]["building"!~"hut"]["building"!~"shed"](poly: "${polygon}");
        );
      out count;`;

    try {
      const { data } = await axios.get(
        `https://overpass.kumi.systems/api/interpreter?data=${overpassQuery.replace(
          "\n",
          ""
        )}`
      );

      if (update) {
        const updatedClaim = await this.core.getPrisma().claim.update({
          where: { id: claim.id },
          data: { buildings: parseInt(data?.elements[0]?.tags?.total) || 0 },
        });
        return updatedClaim;
      } else {
        return parseInt(data?.elements[0]?.tags?.total) || 0;
      }
    } catch (e) {
      this.core.getLogger().error(e.message);
      return e;
    }
  }
}

export default ClaimController;
