import { Request, Response } from "express";

import Core from "../Core.js";
import { rerenderFrontendMultiple } from "../util/Webhook.js";
import { validationResult } from "express-validator";

class ShowcaseController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getShowcases(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const showcases = await this.core.getPrisma().showcase.findMany({
      where: { buildTeamId: req.params.id },
      include: {
        image: true,
      },
    });
    res.send(showcases);
  }

  public async getAllShowcases(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const showcases = await this.core.getPrisma().showcase.findMany({
      include: {
        image: true,
        buildTeam: {
          select: {
            name: true,
            location: true,
            slug: true,
            icon: true,
            id: true,
          },
        },
      },
    });
    res.send(showcases);
  }

  public async getRandomShowcases(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const showcases = await this.core.getPrisma().showcase.findMany({
      include: {
        image: true,
        buildTeam: {
          select: {
            name: true,
            location: true,
            slug: true,
            icon: true,
            id: true,
          },
        },
      },
    });

    const randomIndexes = [];

    for (let i = 0; i < parseInt(req.query.limit as string); i++) {
      randomIndexes.push(Math.floor(Math.random() * showcases.length));
    }

    res.send(showcases.filter((s, index) => randomIndexes.includes(index)));
  }
}

export default ShowcaseController;
