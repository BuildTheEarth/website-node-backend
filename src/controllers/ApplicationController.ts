import { Request, Response } from "express";

import Core from "../Core.js";
import { questions } from "../util/QuestionData.js";
import { userHasPermission } from "../web/routes/utils/CheckUserPermissionMiddleware.js";
import { validationResult } from "express-validator";
import yup from "yup";

class ApplicationController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getApplications(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const includeFilter = {
      buildteam: req.query.includeBuildteam === "true",
      reviewer: req.query.includeReviewer === "true",
      ApplicationAnswer: req.query.includeAnswers === "true",
    };

    if (
      await userHasPermission(
        this.core.getPrisma(),
        req.kauth.grant.access_token.content.sub,
        "application.list"
      )
    ) {
      if (req.query.page) {
        let page = parseInt(req.query.page as string);
        const applications = await this.core.getPrisma().application.findMany({
          skip: page * 10,
          take: 10,
          include: includeFilter,
        });
        let count = await this.core.getPrisma().application.count();
        res.send({ pages: Math.ceil(count / 10), data: applications });
      } else {
        const applications = await this.core.getPrisma().application.findMany({
          include: includeFilter,
        });
        res.send(applications);
      }
    } else if (
      req.query.buildteam &&
      (await userHasPermission(
        this.core.getPrisma(),
        req.kauth.grant.access_token.content.sub,
        "application.list",
        req.query.buildteam as string
      ))
    ) {
      if (req.query.page) {
        let page = parseInt(req.query.page as string);
        const applications = await this.core.getPrisma().application.findMany({
          where: {
            buildteamId: req.query.buildteam as string,
          },
          skip: page * 10,
          take: 10,
          include: includeFilter,
        });
        let count = await this.core.getPrisma().application.count();
        res.send({ pages: Math.ceil(count / 10), data: applications });
      } else {
        const applications = await this.core.getPrisma().application.findMany({
          where: {
            buildteamId: req.query.buildteam as string,
          },
          include: includeFilter,
        });
        res.send(applications);
      }
    } else {
      return res.status(400).json({
        errors: [
          {
            location: "query",
            msg: "Missing value",
            path: "buildteam",
            type: "field",
          },
        ],
      });
    }
  }
  public async getApplication(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const application = await this.core.getPrisma().application.findUnique({
      where: {
        id: req.params.id,
      },
    });
    if (application) {
      if (
        await userHasPermission(
          this.core.getPrisma(),
          req.kauth.grant.access_token.content.sub,
          "application.list",
          application?.buildteamId
        )
      ) {
        res.send(application);
      } else {
        res.status(403).send("You don't have permission to do this!");
      }
    } else {
      res.status(404).send({
        code: 404,
        message: "Applicationdoes not exit.",
        translationKey: "404",
      });
    }
    return;
  }
}

export default ApplicationController;
