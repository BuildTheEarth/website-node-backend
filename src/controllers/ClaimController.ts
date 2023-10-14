import { Request, Response } from "express";
import turf, { toPolygon } from "../util/Turf.js";

import Core from "../Core.js";
import { parseApplicationStatus } from "../util/Parser.js";
import { userHasPermissions } from "../web/routes/utils/CheckUserPermissionMiddleware.js";
import { validationResult } from "express-validator";

class ClaimController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getClaims(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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
      return res.status(400).json({ errors: errors.array() });
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
      return res.status(400).json({ errors: errors.array() });
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
          },
        },
        builders: true,
      },
    });
    if (claim) {
      res.send(claim);
    } else {
      res.status(404).send({
        code: 404,
        message: "Claim does not exit.",
        translationKey: "404",
      });
    }
    return;
  }
}

export default ClaimController;
