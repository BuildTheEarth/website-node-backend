import {
  Application,
  ApplicationStatus,
  BuildTeam,
  User,
} from "@prisma/client";
import { Request, Response } from "express";

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
        buildteam: req.query.slug
          ? { slug: req.params.id }
          : { id: req.params.id },
        status: req.query.review
          ? { in: [ApplicationStatus.SEND, ApplicationStatus.REVIEWING] }
          : undefined,
      },
    });

    res.send(applications);
  }

  public async getUserApplications(req: Request, res: Response) {
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
        buildteam: req.query.slug
          ? { slug: req.params.id }
          : { id: req.params.id },
      },
    });

    const user = await this.core.getPrisma().user.findUnique({
      where: {
        id: req.params.user as string,
      },
    });

    if (req.query.pending) {
      applications = applications.filter(
        (a) =>
          a.status == ApplicationStatus.REVIEWING ||
          a.status == ApplicationStatus.SEND
      );
    }

    if (user.ssoId == req.kauth.grant.access_token.content.sub) {
      res.send(applications);
    } else if (
      await userHasPermissions(
        this.core.getPrisma(),
        req.kauth.grant.access_token.content.sub,
        ["team.application.list"],
        req.query.id as string
      )
    ) {
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

    const application = await this.core.getPrisma().application.findFirst({
      where: {
        id: req.params.app,
        buildteam: req.query.slug
          ? { slug: req.params.id }
          : { id: req.params.id },
      },
      include: {
        ApplicationAnswer:
          req.query.includeAnswers === "true"
            ? { include: { question: true } }
            : undefined,
        user:
          req.query.includeUser === "true"
            ? { select: { id: true, discordId: true, name: true } }
            : undefined,
      },
    });

    if (application) {
      res.send(application);
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

    const { status, reason } = req.body;
    const reviewer = req.user;

    const application = await this.core.getPrisma().application.update({
      where: {
        id: req.params.app,
      },
      data: {
        reviewer: { connect: { id: reviewer.id } },
        reviewedAt: status != "REVIEWING" ? new Date() : null,
        status: parseApplicationStatus(status),
        reason,
      },
      include: {
        ApplicationAnswer: { include: { question: true } },
        buildteam: {
          select: {
            name: true,
            id: true,
            slug: true,
            acceptionMessage: true,
            rejectionMessage: true,
            trialMessage: true,
          },
        },
      },
    });

    if (parseApplicationStatus(status) == ApplicationStatus.ACCEPTED) {
      const user = await this.core.getPrisma().user.update({
        where: { id: application.userId },
        data: {
          joinedBuildTeams: { connect: { id: application.buildteamId } },
        },
        select: { discordId: true },
      });

      await this.core
        .getDiscord()
        .sendBotMessage(
          this.mutateApplicationMessage(
            application.buildteam.acceptionMessage,
            application,
            user,
            application.buildteam
          ),
          [user.discordId]
        );
      await this.core.getDiscord().updateBuilderRole(user.discordId, true);
    } else if (parseApplicationStatus(status) == ApplicationStatus.TRIAL) {
      const user = await this.core.getPrisma().user.findFirst({
        where: { id: application.userId },
        select: { discordId: true },
      });
      await this.core
        .getDiscord()
        .sendBotMessage(
          this.mutateApplicationMessage(
            application.buildteam.trialMessage,
            application,
            user,
            application.buildteam
          ),
          [user.discordId]
        );
    } else {
      const user = await this.core.getPrisma().user.update({
        where: { id: application.userId },
        data: {
          joinedBuildTeams: { disconnect: { id: application.buildteamId } },
        },
        select: {
          discordId: true,
          _count: {
            select: { joinedBuildTeams: true },
          },
        },
      });

      await this.core
        .getDiscord()
        .sendBotMessage(
          this.mutateApplicationMessage(
            application.buildteam.rejectionMessage,
            application,
            user,
            application.buildteam
          ),
          [user.discordId]
        );

      if (user._count.joinedBuildTeams < 1) {
        await this.core.getDiscord().updateBuilderRole(user.discordId, false);
      }
    }

    await this.core.getDiscord().sendApplicationUpdate(application);

    res.send(application);
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
      where: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
      select: {
        instantAccept: true,
        applicationQuestions: true,
        id: true,
        slug: true,
        name: true,
        acceptionMessage: true,
      },
    });

    if (buildteam) {
      const pastApplications = await this.core
        .getPrisma()
        .application.findMany({
          where: { userId: req.user.id, buildteamId: buildteam.id },
        });
      const answers = req.body;
      const trial = req.query.trial ? true : false;
      const validatedAnswers = [];

      // User is already accepted to the buildteam
      if (
        pastApplications.some((a) => a.status == ApplicationStatus.ACCEPTED)
      ) {
        return res.status(400).send({
          code: 400,
          message: "You are already a builder of this buildteam.",
          translationKey: "400",
        });

        // User already applied, waiting for review
      } else if (
        pastApplications.some(
          (a) =>
            a.status == ApplicationStatus.REVIEWING ||
            a.status == ApplicationStatus.SEND
        )
      ) {
        return res.status(400).send({
          code: 400,
          message: "You already have an application pending review.",
          translationKey: "400",
        });

        // Double trial application
      } else if (
        pastApplications.some((a) => a.status == ApplicationStatus.TRIAL) &&
        trial
      ) {
        return res.status(400).send({
          code: 400,
          message: "You are already a trial of this buildteam.",
          translationKey: "400",
        });
      }

      if (buildteam.instantAccept) {
        const application = await this.core.getPrisma().application.create({
          data: {
            buildteam: { connect: { id: buildteam.id } },
            user: { connect: { id: req.user.id } },
            status: ApplicationStatus.ACCEPTED,
            createdAt: new Date(),
            reviewedAt: new Date(),
            trial: false,
          },
        });

        await this.core
          .getDiscord()
          .sendBotMessage(
            this.mutateApplicationMessage(
              buildteam.acceptionMessage,
              application,
              req.user,
              buildteam
            ),
            [req.user.discordId]
          );
      }

      for (const question of buildteam.applicationQuestions) {
        // Filter by correct questions
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
        const pAnswers = await this.core
          .getPrisma()
          .applicationAnswer.createMany({
            data: validatedAnswers.map((a) => ({
              answer: a.answer,
              applicationId: application.id,
              questionId: a.id,
            })),
          });

        const reviewers = await this.core.getPrisma().userPermission.findMany({
          where: {
            permissionId: "team.application.review",
            buildTeamId: buildteam.id,
          },
          select: { user: { select: { id: true, discordId: true } } },
        });

        await this.core.getDiscord().sendBotMessage(
          `**${buildteam.name}** \\nNew Application from <@${req.user.discordId}>. Review it [here](${process.env.FRONTEND_URL}/teams/${buildteam.slug}/manage/review/${application.id})`,
          reviewers.map((r) => r.user.discordId)
        );

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

  private mutateApplicationMessage(
    message: string,
    application: Application,
    user: { discordId: string },
    team: { slug: string; name: string }
  ): string {
    return message
      .replace("{user}", `<@${user.discordId}>`)
      .replace("{team}", team.name)
      .replace("{url}", process.env.FRONTEND_URL + `/teams/${team.slug}`)
      .replace("{reason}", application.reason)
      .replace(
        "{reviewedAt}",
        new Date(application.reviewedAt).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        })
      )
      .replace(
        "{createdAt}",
        new Date(application.createdAt).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        })
      )
      .replace("{id}", application.id.toString().split("-")[0]);
  }
}

export default ApplicationController;
