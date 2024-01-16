import { Request, Response } from "express";
import { ERROR_GENERIC, ERROR_VALIDATION } from "../util/Errors.js";
import turf, { toPolygon } from "../util/Turf.js";

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
    };

    const claims = await this.core.getPrisma().claim.findMany({
      where: { finished: filters.finished, active: filters.active },
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
        builders: true,
      },
    });
    if (claim) {
      res.send(claim);
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

    const { name, finished, active, area } = req.body;
    const claim = await this.core.getPrisma().claim.update({
      where: {
        id: req.params.id,
      },
      data: {
        name,
        finished,
        active,
        area: area.map((p: [number, number]) => p.join(", ")),
        center: turf
          .center({
            type: "Feature",
            geometry: { coordinates: [area], type: "Polygon" },
          })
          .geometry.coordinates.join(", "),
      },
    });

    this.core.getDiscord().sendClaimUpdate(claim);
    res.send(claim);
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
          area &&
          turf
            .center({
              type: "Feature",
              geometry: { coordinates: area, type: "Polygon" },
            })
            .geometry.coordinates.join(", "),
        owner: { connect: { id: req.user.id } },
        builders: req.body.builders
          ? { connect: req.body.builders.map((b: any) => ({ id: b })) }
          : undefined,
        name: req.body.name,
        finished: req.body.finished,
        active: req.body.active,
      },
    });

    res.send(claim);
  }

  public async deleteClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }
    const claim = await this.core.getPrisma().claim.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user.id,
      },
    });

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
}

export default ClaimController;
