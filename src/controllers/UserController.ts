import { ApplicationStatus, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import {
  ERROR_GENERIC,
  ERROR_NO_PERMISSION,
  ERROR_VALIDATION,
} from "../util/Errors.js";

import { validationResult } from "express-validator";
import Core from "../Core.js";
import { userHasPermissions } from "../web/routes/utils/CheckUserPermissionMiddleware.js";

class UserController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getUsers(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      const users = await this.core.getPrisma().user.findMany({
        skip: page * 10,
        take: 10,
      });
      let count = await this.core.getPrisma().user.count();
      res.send({ pages: Math.ceil(count / 10), data: users });
    } else {
      const users = await this.core.getPrisma().user.findMany({});
      res.send(users);
    }
  }
  public async searchBuilders(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    // const builders = await this.core
    //   .getPrisma()
    //   .user.findMany({
    //     take: req.query.take ? parseInt(req.query.take as string) : 10,
    //     where:{us}
    //   });
    const kcBuilders = (
      await this.core
        .getKeycloakAdmin()
        .getKeycloakAdminClient()
        .users.find({
          max: req.query.take ? parseInt(req.query.take as string) : 10,
          username: (req.query.search as string) || "",
          enabled: true,
          exact: req.query.exact == "true",
        })
    ).map((b) => ({ username: b.username, ssoId: b.id }));

    // const builders = await Promise.all(
    //   claim.builders?.map(async (member) => {
    //     const kcMember = await this.core
    //       .getKeycloakAdmin()
    //       .getKeycloakAdminClient()
    //       .users.findOne({
    //         id: member.ssoId,
    //       });
    //     return {
    //       discordId: member.discordId,
    //       id: member.id,
    //       username: kcMember?.username,
    //       avatar: member.avatar,
    //       name: member.name,
    //     };
    //   })
    // );
    const builders = (
      await this.core.getPrisma().user.findMany({
        where: { ssoId: { in: kcBuilders.map((b) => b.ssoId) } },
        select: {
          name: true,
          minecraft: true,
          id: true,
          avatar: true,
          discordId: true,
          ssoId: true,
        },
      })
    ).map((b) => ({ ...b, ...kcBuilders.find((c) => c.ssoId == b.ssoId) }));

    res.send(builders);
  }

  public async searchUsers(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    const searchQuery = {
      discordId: req.query.discord as string,
      minecraft: req.query.minecraft as string,
      id: req.query.id as string,
      ssoId: req.query.ssoId as string,
    };

    const users = await this.core.getPrisma().user.findMany({
      where: searchQuery,
      take: req.query.limit ? parseInt(req.query.limit as string) : 10,
      select: {
        id: true,
        ssoId: true,
        avatar: true,
        _count: {
          select: {
            joinedBuildTeams: true,
            createdBuildTeams: true,
            claims: true,
            claimsBuilder: true,
          },
        },
      },
    });
    const kcUsers = await Promise.all(
      users?.map(async (user) => {
        const kcUser = await this.core
          .getKeycloakAdmin()
          .getKeycloakAdminClient()
          .users.findOne({
            id: user.ssoId,
          });
        const discordIdentity = kcUser.federatedIdentities.find(
          (identity) => identity.identityProvider == "discord"
        );
        return {
          ...user,
          username: kcUser?.username,
          minecraft: kcUser?.attributes?.minecraft?.at(0) || null,
          minecraftVerified:
            kcUser?.attributes?.minecraftVerified?.at(0) == "true" || false,
          createdAt: new Date(kcUser?.createdTimestamp || 0).toISOString(),
          discordId: discordIdentity.userId,
          discordName: discordIdentity.userName.replace("#0", ""),
        };
      })
    );
    res.send(kcUsers);
  }

  public async getUser(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    if (!req.kauth.grant) ERROR_NO_PERMISSION(req, res);

    const user = await this.core.getPrisma().user.findFirst({
      where: {
        id: req.params.id,
      },
      include: {
        applications: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            reviewedAt: true,
            reason: true,
            trial: true,
            buildteam: { select: { name: true, id: true } },
          },
        },
        createdBuildTeams: {
          select: {
            id: true,
            slug: true,
            location: true,
            icon: true,
            name: true,
            creatorId: true,
          },
        },
        claims: {
          select: { name: true, finished: true, id: true, center: true },
        },
        claimsBuilder: {
          select: { name: true, finished: true, id: true, center: true },
        },
        joinedBuildTeams: {
          select: {
            id: true,
            slug: true,
            location: true,
            icon: true,
            name: true,
            creatorId: true,
            allowBuilderClaim: true,
          },
        },
      },
    });
    const buildTeamManager = await this.core.getPrisma().buildTeam.findMany({
      where: {
        UserPermission: {
          some: {
            userId: user.id,
          },
        },
        id: { notIn: user.createdBuildTeams.map((b) => b.id) },
      },
      select: {
        id: true,
        slug: true,
        location: true,
        icon: true,
        name: true,
        creatorId: true,
        token: false,
        webhook: false,
      },
    });
    user.createdBuildTeams = user.createdBuildTeams.concat(buildTeamManager);
    if (user.ssoId == req.kauth.grant.access_token.content.sub) {
      res.send(user);
    } else if (
      await userHasPermissions(
        this.core.getPrisma(),
        req.kauth.grant.access_token.content.sub,
        ["users.list"]
      )
    ) {
      res.send(user);
    } else {
      ERROR_NO_PERMISSION(req, res);
    }
  }

  public async getKeycloakUser(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    if (!req.kauth.grant) return ERROR_NO_PERMISSION(req, res);

    const user = await this.core.getPrisma().user.findFirst({
      where: {
        id: req.params.id,
      },
    });

    const kcUser = await this.core
      .getKeycloakAdmin()
      .getKeycloakAdminClient()
      .users.findOne({ id: user.ssoId });
    const kcSessions = await this.core
      .getKeycloakAdmin()
      .getKeycloakAdminClient()
      .users.listSessions({ id: user.ssoId });

    if (user.ssoId == req.kauth.grant.access_token.content.sub) {
      res.send({ ...user, ...kcUser, sessions: kcSessions });
    } else if (
      await userHasPermissions(
        this.core.getPrisma(),
        req.kauth.grant.access_token.content.sub,
        ["users.list"]
      )
    ) {
      res.send({ ...user, ...kcUser, sessions: kcSessions });
    } else {
      ERROR_NO_PERMISSION(req, res);
    }
  }

  public async getUserReviews(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    if (!req.kauth.grant) {
      return ERROR_NO_PERMISSION(req, res);
    }
    const user = await this.core.getPrisma().user.findFirst({
      where: {
        id: req.params.id,
      },
    });

    if (user.ssoId != req.kauth.grant.access_token.content.sub) {
      return ERROR_NO_PERMISSION(req, res);
    }

    const reviewPermissions = await this.core
      .getPrisma()
      .userPermission.findMany({
        where: {
          userId: user.id,
          permissionId: "team.application.review",
          buildTeamId: { not: null },
        },
        select: { buildTeamId: true, id: true },
      });

    const applications = await this.core.getPrisma().application.findMany({
      where: {
        status: { in: [ApplicationStatus.SEND, ApplicationStatus.REVIEWING] },
        buildteamId: { in: reviewPermissions.map((p) => p.buildTeamId) },
      },
      include: {
        buildteam: { select: { slug: true, name: true, icon: true } },
      },
    });

    res.send(applications);
  }

  public async updateUser(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    const { email, firstName, lastName, username, name, avatar } = req.body;

    const user = await this.core.getPrisma().user.findFirst({
      where: {
        id: req.params.id,
      },
    });
    if (user.ssoId == req.kauth.grant.access_token.content.sub) {
      const user = await this.core
        .getPrisma()
        .user.update({ where: { id: req.params.id }, data: { name, avatar } });
      await this.core
        .getKeycloakAdmin()
        .getKeycloakAdminClient()
        .users.update(
          { id: user.ssoId },
          { firstName, lastName, username, email }
        );
      const kcUser = await this.core
        .getKeycloakAdmin()
        .getKeycloakAdminClient()
        .users.findOne({ id: user.ssoId });

      res.send({ ...user, ...kcUser });
    }
  }

  public async getPermissions(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    const permissions = await this.core.getPrisma().userPermission.findMany({
      where: { userId: req.params.id },
      include: { permission: true },
    });
    res.send(permissions);
  }

  public async addPermission(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    if (!(req.body.permission || req.body.permissions)) {
      return ERROR_VALIDATION(req, res, [
        { msg: "Invalid value", path: "permission" },
      ]);
    }
    const permissions = req.body.permissions || [req.body.permission];
    const userId = req.params.id;

    if (req.query.buildteam) {
      if (
        !(await userHasPermissions(
          this.core.getPrisma(),
          req.kauth.grant.access_token.content.sub,
          ["permission.add"],
          req.query.buildteam as string
        ))
      ) {
        return ERROR_NO_PERMISSION(req, res);
      }

      const buildteam = await this.core.getPrisma().buildTeam.findFirst({
        where: {
          slug: req.query.buildteam as string,
        },
        select: { token: false, id: true, webhook: false },
      });

      if (!buildteam) {
        ERROR_GENERIC(req, res, 404, "BuildTeam does not exist.");
      }

      res.send(
        await addPermission(
          this.core.getPrisma(),
          permissions,
          userId,
          buildteam.id
        )
      );
    } else {
      if (
        !(await userHasPermissions(
          this.core.getPrisma(),
          req.kauth.grant.access_token.content.sub,
          ["permission.add"]
        ))
      ) {
        return ERROR_NO_PERMISSION(req, res);
      }

      res.send(await addPermission(this.core.getPrisma(), permissions, userId));
    }
  }

  public async removePermission(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    if (!(req.body.permission || req.body.permissions)) {
      return ERROR_VALIDATION(req, res, [
        { msg: "Invalid value", path: "permission" },
      ]);
    }
    const permissions = req.body.permissions || [req.body.permission];
    const userId = req.params.id;

    if (req.query.buildteam) {
      if (
        !(await userHasPermissions(
          this.core.getPrisma(),
          req.kauth.grant.access_token.content.sub,
          ["permission.remove"],
          req.query.buildteam as string
        ))
      ) {
        return ERROR_NO_PERMISSION(req, res);
      }

      const buildteam = await this.core.getPrisma().buildTeam.findFirst({
        where: {
          slug: req.query.buildteam as string,
        },
        select: { token: false, id: true, webhook: false },
      });

      if (!buildteam) {
        ERROR_GENERIC(req, res, 404, "BuildTeam does not exist.");
      }

      res.send(
        await removePermission(
          this.core.getPrisma(),
          permissions,
          userId,
          buildteam.id
        )
      );
    } else {
      if (
        !(await userHasPermissions(
          this.core.getPrisma(),
          req.kauth.grant.access_token.content.sub,
          ["permission.remove"]
        ))
      ) {
        return ERROR_NO_PERMISSION(req, res);
      }

      res.send(
        await removePermission(this.core.getPrisma(), permissions, userId)
      );
    }
  }
}

async function addPermission(
  prisma: PrismaClient,
  permissions: string[],
  user: string,
  buildteam?: string
) {
  return await prisma.userPermission.createMany({
    data: permissions.map((permission) => ({
      userId: user,
      buildTeamId: buildteam,
      permissionId: permission,
    })),
  });
}
async function removePermission(
  prisma: PrismaClient,
  permissions: string[],
  user: string,
  buildteam?: string
) {
  return await prisma.userPermission.deleteMany({
    where: {
      userId: user,
      buildTeamId: buildteam,
      permissionId: { in: permissions },
    },
  });
}
export default UserController;
