import { Request, Response } from "express";
import turf, { toPolygon } from "../util/Turf.js";

import Core from "../Core.js";
import { validationResult } from "express-validator";

class TokenRouteContoller {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async addClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { owner, area, active, finished, name } = req.body;
    const team = req.params.team;
    const claim = await this.core.getPrisma().claim.create({
      data: {
        owner: { connect: { id: owner } },
        buildTeam: {
          connect: req.query.slug
            ? { slug: req.params.id }
            : { id: req.params.id },
        },
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

  public async addClaims(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const claims = await this.core.getPrisma().claim.createMany({
      data: req.body.data.map((c) => ({
        ownerId: c.owner,
        buildTeamId: req.params.team,
        name: c.name,
        finished: c.finished,
        active: c.active,
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
}

export default TokenRouteContoller;
