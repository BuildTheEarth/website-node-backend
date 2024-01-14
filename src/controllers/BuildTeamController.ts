import { Request, Response } from "express";
import { ERROR_GENERIC, ERROR_VALIDATION } from "../util/Errors.js";
import { FrontendRoutesGroups, rerenderFrontend } from "../util/Frontend.js";

import { ApplicationQuestionType } from "@prisma/client";
import crypto from "crypto";
import { validationResult } from "express-validator";
import yup from "yup";
import Core from "../Core.js";
import { questions } from "../util/QuestionData.js";

class BuildTeamController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getBuildTeams(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      const buildteams = await this.core.getPrisma().buildTeam.findMany({
        skip: page * 10,
        take: 10,
        include: {
          _count: {
            select: { members: true },
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
      res.send({
        pages: Math.ceil(count / 10),
        data: buildteams.map((b) => ({
          ...b,
          token: undefined,
          webhook: undefined,
        })),
      });
    } else {
      const buildteams = await this.core.getPrisma().buildTeam.findMany({
        include: {
          _count: {
            select: { members: true },
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
      res.send(
        buildteams.map((b) => ({ ...b, token: undefined, webhook: undefined }))
      );
    }
  }

  public async getBuildTeam(req: Request, res: Response) {
    const buildteam = await this.core.getPrisma().buildTeam.findFirst({
      where: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
      include: {
        socials: true,
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
          select: { members: true },
        },
      },
    });
    if (buildteam) {
      res.send({ ...buildteam, token: undefined, webhook: undefined });
    } else {
      ERROR_GENERIC(res, 404, "BuildTeam does not exist.");
    }
  }

  public async getBuildTeamApplicationQuestions(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    let applicationQuestions = await this.core
      .getPrisma()
      .applicationQuestion.findMany({
        where: {
          buildTeam: req.query.slug
            ? { slug: req.params.id }
            : { id: req.params.id },
        },
      });

    if (applicationQuestions) {
      res.send(applicationQuestions);
    } else {
      ERROR_GENERIC(res, 404, "BuildTeam does not exist.");
    }
  }

  public async updateBuildTeamApplicationQuestions(
    req: Request,
    res: Response
  ) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    let buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
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
          additionalData: yup.mixed().optional(),
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

          rerenderFrontend("/teams/[team]", { team: buildteam.slug });
          res.send(validatedSchema);
        })
        .catch((e) => {
          return ERROR_GENERIC(res, 400, e);
        });
    } else {
      ERROR_GENERIC(res, 404, "BuildTeam does not exist.");
    }
  }

  public async getBuildTeamSocials(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    let buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
      include: {
        socials: true,
      },
    });

    if (buildteam) {
      res.send(buildteam.socials);
    } else {
      ERROR_GENERIC(res, 404, "BuildTeam does not exist.");
    }
  }

  public async updateBuildTeamSocials(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    let buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
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
        .validate(req.body.socials)
        .then((validatedSchema) => {
          validatedSchema.forEach(async (question) => {
            const d = await this.core.getPrisma().social.upsert({
              where: {
                id: question.id,
              },
              update: question,
              create: {
                name: question.name || "Website",
                icon: question.icon,
                url: question.url,
                buildTeam: { connect: { id: buildteam.id } },
              },
            });
            console.log(d);
          });

          rerenderFrontend(FrontendRoutesGroups.TEAM, { team: buildteam.slug });

          res.send(validatedSchema);
        })
        .catch((e) => {
          return ERROR_GENERIC(res, 400, e);
        });
    } else {
      ERROR_GENERIC(res, 404, "BuildTeam does not exist.");
    }
  }
  public async deleteBuildTeamSocial(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    try {
      const social = await this.core.getPrisma().social.delete({
        where: { id: req.params.id },
      });
      res.send(social);
    } catch {
      ERROR_GENERIC(res, 404, "BuildTeam does not exist.");
    }
  }
  public async updateBuildTeam(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
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
      allowBuilderClaim,
      allowApplications,
      instantAccept,
      webhook,
      ip,
    } = req.body;
    const buildteam = await this.core.getPrisma().buildTeam.update({
      where: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
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
        allowBuilderClaim,
        instantAccept,
        allowApplications,
        webhook,
        ip,
      },
    });

    rerenderFrontend(FrontendRoutesGroups.TEAM, { team: buildteam.slug });
    res.send(buildteam);
  }

  public async getBuildTeamMembers(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }
    let members;
    let count = 0;
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      members = await this.core.getPrisma().user.findMany({
        skip: page * 100,
        take: 100,
        where: {
          joinedBuildTeams: {
            some: req.query.slug
              ? { slug: req.params.id }
              : { id: req.params.id },
          },
        },
      });
      count = await this.core.getPrisma().user.count({
        where: {
          joinedBuildTeams: {
            some: req.query.slug
              ? { slug: req.params.id }
              : { id: req.params.id },
          },
        },
      });
    } else {
      members = await this.core.getPrisma().user.findMany({
        where: {
          joinedBuildTeams: {
            some: req.query.slug
              ? { slug: req.params.id }
              : { id: req.params.id },
          },
        },
      });
    }

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
          avatar: member.avatar,
        };
      })
    );
    res.send(
      req.query.page
        ? { pages: Math.ceil(count / 100), data: kcMembers }
        : kcMembers
    );
  }

  public async removeBuildTeamMember(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const user = await this.core.getPrisma().user.update({
      where: { id: req.body.user },
      data: {
        joinedBuildTeams: {
          disconnect: req.query.slug
            ? { slug: req.params.id }
            : { id: req.params.id },
        },
      },
    });

    rerenderFrontend(FrontendRoutesGroups.TEAM, { team: req.params.id });

    res.json(user);
  }

  public async getBuildTeamManagers(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const members = await this.core.getPrisma().user.findMany({
      where: {
        permissions: {
          some: {
            buildTeam: req.query.slug
              ? { slug: req.params.id }
              : { id: req.params.id },
          },
        },
      },
      include: {
        permissions: {
          where: {
            buildTeam: req.query.slug
              ? { slug: req.params.id }
              : { id: req.params.id },
          },
        },
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

  public async generateBuildTeamToken(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
      select: {
        token: true,
        id: true,
        name: true,
        webhook: false,
        creator: { select: { id: true, discordId: true } },
      },
    });

    if (!buildteam) {
      return ERROR_GENERIC(res, 404, "BuildTeam does not exist.");
    }

    if (buildteam.creator.id !== req.user.id) {
      return ERROR_GENERIC(
        res,
        403,
        "You are not the Creator of this BuildTeam."
      );
    }
    const token = crypto.randomBytes(21).toString("hex");

    await this.core.getPrisma().buildTeam.update({
      where: { id: buildteam.id },
      data: { token },
    });

    await this.core
      .getDiscord()
      .sendBotMessage(
        `**${buildteam.name}** \\nGenerated new API Token: ||${token}|| \\nPlease save it somewhere secure.`,
        [buildteam.creator.discordId]
      );

    res.send({ message: "Token generated, check your Discord DMs" });
  }
}

export default BuildTeamController;
