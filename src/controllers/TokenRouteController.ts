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
        buildTeam: { connect: { id: team } },
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
}

export default TokenRouteContoller;
