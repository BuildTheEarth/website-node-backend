import { Request, Response } from "express";
import turf, { toPolygon } from "../util/Turf.js";

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
      return res.status(400).json({ errors: errors.array() });
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
      res.status(404).send({
        code: 404,
        message: "Claim does not exist.",
        translationKey: "404",
      });
    }
  }

  public async addClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { owner, area, active, finished, name, id, builders } = req.body;

    if (area[0] != area[area.length - 1]) {
      area.push(area[0]);
    }

    if (typeof area[0] === "string") {
      area = area.map((p: string) =>
        p.split(", ").map((s: string) => parseFloat(s))
      );
    }

    const claim = await this.core.getPrisma().claim.create({
      data: {
        id,
        ownerId: owner,
        buildTeamId: req.team.id,
        builders: { connect: builders.map((b: any) => ({ id: b })) },
        name,
        finished,
        active,
        area: area.map((p: any[]) => p.join(", ")),
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

  public async addClaims(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const claims = await this.core.getPrisma().claim.createMany({
      data: req.body.data.map((c) => ({
        id: c.id,
        ownerId: c.owner,
        buildTeamId: req.params.team,
        name: c.name,
        finished: c.finished,
        active: c.active,
        builders: c.builders
          ? { connect: c.builders.map((b: any) => ({ id: b })) }
          : undefined,
        area: c.area.map((p: [number, number]) => p.join(", ")),
        center: turf
          .center({
            type: "Feature",
            geometry: { coordinates: [c.area], type: "Polygon" },
          })
          .geometry.coordinates.join(", "),
      })),
    });

    res.send(claims);
  }

  public async updateClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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
        area: area ? area.map((p: any[]) => p.join(", ")) : undefined,
        center: area
          ? turf
              .center({
                type: "Feature",
                geometry: { coordinates: [area], type: "Polygon" },
              })
              .geometry.coordinates.join(", ")
          : undefined,
      },
    });

    res.send(claim);
  }

  public async removeClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const claim = await this.core.getPrisma().claim.findFirst({
      where: { id: req.params.id, buildTeamId: req.team.id },
    });

    if (!claim) {
      return res.status(404).send({
        code: 404,
        message: "Claim does not exist.",
        translationKey: "404",
      });
    }

    await this.core.getPrisma().claim.delete({ where: { id: claim.id } });

    this.core.getDiscord().sendClaimUpdate(claim);
    res.send(claim);
  }
}

export default TokenRouteContoller;