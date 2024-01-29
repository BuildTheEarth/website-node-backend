import { Request, Response } from "express";
import turf, { parseCoordinates, toPolygon } from "../util/Coordinates.js";
import { ERROR_GENERIC, ERROR_VALIDATION } from "../util/Errors.js";

import { validationResult } from "express-validator";
import Core from "../Core.js";

class TokenRouteContoller {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getClaims(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      const claims = await this.core.getPrisma().claim.findMany({
        skip: page * 10,
        take: 10,
        where: {
          buildTeamId: req.team.id,
        },
        include: {
          _count: {
            select: { builders: true },
          },
          owner: { select: { id: true, discordId: true, ssoId: true } },
          builders: req.query.withBuilders
            ? { select: { id: true, discordId: true, ssoId: true } }
            : undefined,
        },
      });
      let count = await this.core.getPrisma().claim.count();
      res.send({ pages: Math.ceil(count / 10), data: claims });
    } else {
      const claims = await this.core.getPrisma().claim.findMany({
        where: {
          buildTeamId: req.team.id,
        },
        include: {
          _count: {
            select: { builders: true },
          },
          owner: { select: { id: true, discordId: true, ssoId: true } },
          builders: req.query.withBuilders
            ? { select: { id: true, discordId: true, ssoId: true } }
            : undefined,
        },
      });
      res.send(claims);
    }
  }

  public async getClaim(req: Request, res: Response) {
    const claim = await this.core.getPrisma().claim.findFirst({
      where: { id: req.params.id, buildTeamId: req.team.id },
      include: {
        _count: {
          select: { builders: true },
        },
        owner: { select: { id: true, discordId: true, ssoId: true } },
        builders: req.query.withBuilders
          ? { select: { id: true, discordId: true, ssoId: true } }
          : undefined,
      },
    });
    if (claim) {
      res.send(claim);
    } else {
      ERROR_GENERIC(res, 404, "Claim does not exist.");
    }
  }

  public async addClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    let { owner, area, active, finished, name, id, builders, externalId } =
      req.body;

    if (area[0] != area[area.length - 1]) {
      area.push(area[0]);
    }

    if (typeof area[0] === "string") {
      area = area.map((p: string) =>
        p.split(", ").map((s: string) => parseFloat(s))
      );
    }
    const o = await this.core
      .getPrisma()
      .user.findFirst({ where: { name: owner } });

    if (!o) {
      return ERROR_GENERIC(res, 404, "Owner does not exist.");
    }

    const claim = await this.core.getPrisma().claim.create({
      data: {
        id,
        owner: { connect: { id: o.id } },
        buildTeam: { connect: { id: req.team.id } },
        builders: builders
          ? { connect: builders.map((b: any) => ({ id: b })) }
          : undefined,
        name,
        finished,
        externalId,
        active,
        area: area,
        center: area
          ? turf.center(toPolygon(area)).geometry.coordinates.join(", ")
          : undefined,
      },
    });

    this.core.getDiscord().sendClaimUpdate(claim);
    res.send(claim);
  }

  public async addClaims(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    let claims = [];
    for (const c of req.body.data) {
      const owner = await this.core
        .getPrisma()
        .user.findFirst({ where: { name: c.owner } });
      if (owner) {
        c.owner = owner.id;
      } else {
        c.owner = undefined;
      }

      const claim = await this.core.getPrisma().claim.create({
        data: {
          id: c.id,
          owner: owner ? { connect: { id: owner.id } } : undefined,
          buildTeam: { connect: { id: req.params.team } },
          name: c.name,
          finished: c.finished,
          active: c.active,
          externalId: c.externalId,
          builders: c.builders
            ? { connect: c.builders.map((b: any) => ({ id: b })) }
            : undefined,
          area: parseCoordinates(
            c.area,
            (req.query.coordType as string) || "stringarray"
          ),
          center: turf
            .center(
              toPolygon(
                parseCoordinates(
                  c.area,
                  (req.query.coordType as string) || "stringarray"
                )
              )
            )
            .geometry.coordinates.join(", "),
        },
      });
      claims.push(claim);
    }

    res.send({ data: claims });
  }

  public async updateClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    let { owner, area, active, finished, name, id, builders } = req.body;

    if (area) {
      if (area[0] != area[area.length - 1]) {
        area.push(area[0]);
      }

      if (typeof area[0] === "string") {
        area = area.map((p: string) =>
          p.split(", ").map((s: string) => parseFloat(s))
        );
      }
    }

    const claim = await this.core.getPrisma().claim.update({
      where: { id: req.params.id },
      data: {
        ownerId: owner,
        buildTeamId: req.team.id,
        builders: { set: builders.map((b: any) => ({ id: b })) },
        name,
        finished,
        active,
        area: area,
        center: area
          ? turf.center(toPolygon(area)).geometry.coordinates.join(", ")
          : undefined,
      },
    });

    res.send(claim);
  }

  public async removeClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const claim = await this.core.getPrisma().claim.findFirst({
      where: { id: req.params.id, buildTeamId: req.team.id },
    });

    if (!claim) {
      ERROR_GENERIC(res, 404, "Claim does not exist.");
    }

    await this.core.getPrisma().claim.delete({ where: { id: claim.id } });

    this.core.getDiscord().sendClaimUpdate(claim);
    res.send(claim);
  }
}

export default TokenRouteContoller;
