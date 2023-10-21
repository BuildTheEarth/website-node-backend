import { Request, Response } from "express";

import { ApplicationStatus } from "@prisma/client";
import Core from "../Core.js";
import { parseApplicationStatus } from "../util/Parser.js";
import { userHasPermissions } from "../web/routes/utils/CheckUserPermissionMiddleware.js";
import { validate as uuidValidate } from "uuid";
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

    if (!req.user) {
      return res.status(401).json("You are not permited to do this!");
    }

    let applications = await this.core.getPrisma().application.findMany({
      where: {
        userId: req.params.user as string,
        buildteamId: req.params.id as string,
      },
    });
    const user = await this.core.getPrisma().user.findUnique({
      where: {
        id: req.params.user as string,
      },
    });

    if (req.query.pending) {
      applications = applications.filter((a) => a.status == ApplicationStatus.REVIEWING || a.status == ApplicationStatus.SEND);
    }

    if (user.ssoId == req.kauth.grant.access_token.content.sub) {
      res.send(applications);
    } else if (await userHasPermissions(this.core.getPrisma(), req.kauth.grant.access_token.content.sub, ["team.application.list"], req.query.id as string)) {
      res.send(applications);
    } else {
      res.status(401).send("You don't have permission to do this!");
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
      include: {
        buildteam: req.query.includeBuildteam === "true",
        reviewer: req.query.includeReviewer === "true",
        claim: req.query.includeClaim === "true",
        ApplicationAnswer: req.query.includeAnswers === "true",
      },
    });
    if (application) {
      if (await userHasPermissions(this.core.getPrisma(), req.kauth.grant.access_token.content.sub, ["application.list"], application?.buildteamId)) {
        res.send(application);
      } else {
        res.status(403).send("You don't have permission to do this!");
      }
    } else {
      res.status(404).send({
        code: 404,
        message: "Application does not exit.",
        translationKey: "404",
      });
    }
    return;
  }

  public async review(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, reason, claimActive, isTrial } = req.body;
    const reviewer = req.user;

    const application = await this.core.getPrisma().application.update({
      where: {
        id: req.params.id,
      },
      data: {
        reviewer: { connect: { id: reviewer.id } },
        reviewedAt: status != "reviewing" ? new Date() : null,
        claim: { update: { active: claimActive } },
        status: parseApplicationStatus(status, isTrial),
        reason,
      },
    });
    console.log(req.params.id, application);
    res.send(application);

    // TODO: Update user rank+perms
    // body: isTrial for trial building
  }

  public async apply(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.user) {
      res.status(401).send("You don't have permission to do this!");
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
      const pastApplications = await this.core.getPrisma().application.findMany({ where: { userId: req.user.id, buildteamId: buildteam.id } });
      const answers = req.body;
      const trial = req.query.trial ? true : false;
      const validatedAnswers = [];

      if (pastApplications.some((a) => a.status == ApplicationStatus.ACCEPTED)) {
        return res.status(400).send({
          code: 400,
          message: "You are already a builder of this buildteam.",
          translationKey: "400",
        });
      } else if (pastApplications.some((a) => a.status == ApplicationStatus.REVIEWING || a.status == ApplicationStatus.SEND)) {
        return res.status(400).send({
          code: 400,
          message: "You already have an application pending review.",
          translationKey: "400",
        });
      } else if (pastApplications.some((a) => a.status == ApplicationStatus.TRIAL) && trial) {
        return res.status(400).send({
          code: 400,
          message: "You are already a trial of this buildteam.",
          translationKey: "400",
        });
      }

      for (const question of buildteam.applicationQuestions) {
        if (question.trial == trial) {
          if (answers[question.id]) {
            // TODO: validate answer type
            let answer = answers[question.id];

            if (typeof answer != "string") {
              if (typeof answer == "number") {
                answer = answer.toString();
              } else {
                try {
                  answer = JSON.stringify(answer);
                } catch (e) {}
              }
            }
            validatedAnswers.push({ id: question.id, answer: answer });
          } else if (question.required) {
            return res.status(400).send({
              code: 400,
              message: "Missing required question.",
              translationKey: "400",
            });
          }
        }
      }

      if (validatedAnswers.length >= 0) {
        const application = await this.core.getPrisma().application.create({
          data: {
            buildteam: { connect: { id: buildteam.id } },
            user: { connect: { id: req.user.id } },
            status: ApplicationStatus.SEND,
            createdAt: new Date(),
            trial: trial,
          },
        });
        const pAnswers = await this.core.getPrisma().applicationAnswer.createMany({ data: validatedAnswers.map((a) => ({ answer: a.answer, applicationId: application.id, questionId: a.id })) });
        res.send(application);
      } else {
        return res.status(400).send({
          code: 400,
          message: "No questions provided.",
          translationKey: "400",
        });
      }
    } else {
      res.status(404).send({
        code: 404,
        message: "Buildteam does not exit.",
        translationKey: "404",
      });
    }
  }
}

export default ApplicationController;
