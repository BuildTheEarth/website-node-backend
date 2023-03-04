import {Request, Response} from "express";

import Core from "../Core.js";
import {validationResult} from "express-validator";

class BuildTeamController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getBuildTeams(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      const buildteams = await this.core.getPrisma().buildTeam.findMany({
        skip: page * 10,
        take: 10,
        include: {
          _count: {
            select: { members: true, builds: true },
          },
        },
      });
      let count = await this.core.getPrisma().buildTeam.count();
      res.send({ pages: Math.ceil(count / 10), data: buildteams });
    } else {
      const buildteams = await this.core.getPrisma().buildTeam.findMany({
        include: {
          _count: {
            select: { members: true, builds: true },
          },
        },
      });
      res.send(buildteams);
    }
  }
  public async getBuildTeam(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const buildteam = await this.core.getPrisma().buildTeam.findFirst({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { members: true, builds: true },
        },
      },
    });
    if (buildteam) {
      res.send(buildteam);
    } else {
      res.status(404).send({
        code: 404,
        message: "Buildteam does not exit.",
        translationKey: "404",
      });
    }
  }

  public async getBuildTeamApplicationQuestion(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        applicationQuestions: true,
      },
    });

    if (buildteam) {
      res.send(buildteam.applicationQuestions);
    } else {
      res
        .status(404)
        .send({
          code: 404,
          message: "Buildteam does not exit.",
          translationKey: "404",
        });
    }
  }

  public async updateBuildTeamApplicationQuestion(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    res.send("test");
  }
}

export default BuildTeamController
