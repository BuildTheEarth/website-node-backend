import { Request, Response } from "express";
import { rerenderFrontend, rerenderFrontendMultiple } from "../util/Webhook.js";

import { ApplicationQuestionType } from "@prisma/client";
import Core from "../Core.js";
import { validationResult } from "express-validator";
import yup from "yup";

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
          members: req.user
            ? {
                where: {
                  id: req.user.id,
                },
              }
            : false,
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
          members: req.user
            ? {
                where: {
                  id: req.user.id,
                },
              }
            : false,
        },
      });
      res.send(buildteams);
    }
  }

  public async getBuildTeam(req: Request, res: Response) {
    const buildteam = await this.core.getPrisma().buildTeam.findFirst({
      where: { id: req.params.id },
      include: {
        socials: true,
        builds: req.query.builds ? true : false,
        showcases: req.query.showcase ? true : false,
        members: req.query.members
          ? true
          : req.user
          ? {
              where: {
                id: req.user.id,
              },
            }
          : false,
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

  public async getBuildTeamApplicationQuestions(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let applicationQuestions = await this.core
      .getPrisma()
      .applicationQuestion.findMany({
        where: {
          buildTeamId: req.params.id,
        },
      });

    if (applicationQuestions) {
      res.send(applicationQuestions);
    } else {
      res.status(404).send({
        code: 404,
        message: "Buildteam does not exit.",
        translationKey: "404",
      });
    }
  }

  public async updateBuildTeamApplicationQuestions(
    req: Request,
    res: Response
  ) {
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
      // validate schema

      let schema = yup.array().of(
        yup.object({
          id: yup.string(),
          title: yup.string(),
          subtitle: yup.string(),
          placeholder: yup.string(),
          required: yup.boolean().default(false),
          icon: yup.string(),
          sort: yup.number(),
          type: yup.mixed().oneOf(Object.keys(ApplicationQuestionType)),
        })
      );

      schema
        .validate(req.body)
        .then((validatedSchema) => {
          validatedSchema.forEach(async (question: any) => {
            await this.core.getPrisma().applicationQuestion.upsert({
              where: {
                id: question.id,
              },
              update: { ...question, buildTeamId: undefined },
              create: {
                ...question,
                buildTeamId: undefined,
                buildTeam: { connect: { id: buildteam.id } },
              },
            });
          });

          res.send(validatedSchema);
        })
        .catch((e) => {
          res.status(400).send(e);
        });
    } else {
      res.status(404).send({
        code: 404,
        message: "Buildteam does not exit.",
        translationKey: "404",
      });
    }
  }

  public async getBuildTeamSocials(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        socials: true,
      },
    });

    if (buildteam) {
      res.send(buildteam.socials);
    } else {
      res.status(404).send({
        code: 404,
        message: "Buildteam does not exit.",
        translationKey: "404",
      });
    }
  }

  public async updateBuildTeamSocials(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        socials: true,
      },
    });

    if (buildteam) {
      // validate schema

      let schema = yup.array().of(
        yup.object({
          id: yup.string(),
          name: yup.string(),
          icon: yup.string(),
          url: yup.string(),
        })
      );

      schema
        .validate(req.body)
        .then((validatedSchema) => {
          validatedSchema.forEach((question) => {
            this.core.getPrisma().social.update({
              where: {
                id: question.id,
              },
              data: question,
            });
          });

          rerenderFrontendMultiple([
            `/teams/${req.params.id}/apply`,
            `/teams/${req.params.id}/manage/apply`,
          ]);

          res.send(validatedSchema);
        })
        .catch((e) => {
          res.status(400).send(e);
        });
    } else {
      res.status(404).send({
        code: 404,
        message: "Buildteam does not exit.",
        translationKey: "404",
      });
    }
  }

  public async updateBuildTeam(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      icon,
      backgroundImage,
      invite,
      about,
      location,
      allowTrial,
      slug,
      acceptionMessage,
      rejectionMessage,
      trialMessage,
    } = req.body;
    const buildteam = await this.core.getPrisma().buildTeam.update({
      where: { id: req.params.id },
      data: {
        name,
        icon,
        backgroundImage,
        invite,
        about,
        location,
        allowTrial,
        slug,
        acceptionMessage,
        rejectionMessage,
        trialMessage,
      },
    });

    rerenderFrontendMultiple([
      "/teams",
      `/teams/${req.params.id}`,
      `/teams/${req.params.id}/manage/settings`,
    ]);
    res.send(buildteam);
  }

  public async getBuildTeamMembers(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const members = await this.core.getPrisma().user.findMany({
      where: {
        joinedBuildTeams: { some: { id: req.params.id } },
      },
    });

    const kcMembers = await Promise.all(
      members.map(async (member) => {
        const kcMember = await this.core
          .getKeycloakAdmin()
          .getKeycloakAdminClient()
          .users.findOne({
            id: member.ssoId,
          });
        return {
          id: member.id,
          ssoId: member.ssoId,
          discordId: member.discordId,
          createdTimestamp: kcMember?.createdTimestamp,
          email: kcMember?.email,
          username: kcMember?.username,
          enabled: kcMember?.enabled,
          emailVerified: kcMember?.emailVerified,
        };
      })
    );
    res.send(kcMembers);
  }

  public async removeBuildTeamMember(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await this.core.getPrisma().user.update({
      where: { id: req.body.user },
      data: { joinedBuildTeams: { disconnect: { id: req.params.id } } },
    });

    rerenderFrontendMultiple([
      "/teams",
      `/teams/${req.params.id}`,
      `/teams/${req.params.id}/manage/members`,
    ]);

    res.json(user);
  }

  public async getBuildTeamManagers(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const members = await this.core.getPrisma().user.findMany({
      where: {
        permissions: { some: { buildTeamId: req.params.id } },
      },
      include: { permissions: { where: { buildTeamId: req.params.id } } },
    });

    const kcMembers = await Promise.all(
      members.map(async (member) => {
        const kcMember = await this.core
          .getKeycloakAdmin()
          .getKeycloakAdminClient()
          .users.findOne({
            id: member.ssoId,
          });
        return {
          id: member.id,
          ssoId: member.ssoId,
          discordId: member.discordId,
          createdTimestamp: kcMember?.createdTimestamp || "",
          email: kcMember?.email || "",
          username: kcMember?.username || "",
          enabled: kcMember?.enabled || false,
          emailVerified: kcMember?.emailVerified || false,
          permissions: member.permissions,
        };
      })
    );
    res.send(kcMembers);
  }

  public async apply(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  }
}

export default BuildTeamController;
