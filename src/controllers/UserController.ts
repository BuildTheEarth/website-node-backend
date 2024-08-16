import { ApplicationStatus, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import Core, { ExtendedPrismaClient } from "../Core.js";
import {
  ERROR_GENERIC,
  ERROR_NO_PERMISSION,
  ERROR_VALIDATION,
} from "../util/Errors.js";

import type KcAdminClient from "@keycloak/keycloak-admin-client";
import { validationResult } from "express-validator";
import { userHasPermissions } from "../web/routes/utils/CheckUserPermissionMiddleware.js";

class UserController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  /**
   * Gets all users, supports pagination
   */
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

  /**
   * Finds users based on username
   */
  public async searchBuilders(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

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

  /**
   * Searches for Users in the DB, option for bulk search
   */
  public async searchUsers(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    if (req.query.bulk == "true") {
      const users = await Promise.all(
        req.body.query.map(async (query) =>
          searchUser(
            this.core.getPrisma(),
            this.core.getKeycloakAdmin().getKeycloakAdminClient(),
            {
              discordId: query.discord as string,
              minecraft: query.minecraft as string,
              id: query.id as string,
              ssoId: query.ssoId as string,
            }
          )
        )
      );
      res.send(users);
    } else {
      res.send(
        await searchUser(
          this.core.getPrisma(),
          this.core.getKeycloakAdmin().getKeycloakAdminClient(),
          {
            discordId: req.query.discord as string,
            minecraft: req.query.minecraft as string,
            id: req.query.id as string,
            ssoId: req.query.ssoId as string,
          },
          req.query.limit && parseInt(req.query.limit as string)
        )
      );
    }
  }

  /**
   * Get a single User
   */
  public async getUser(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    if (!req.kauth.grant) ERROR_NO_PERMISSION(req, res);

    let user;

    const dbUser = await this.core.getPrisma().user.findFirst({
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
    user = dbUser;

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

    if (req.query.withKeycloak) {
      const kcUser = await this.core
        .getKeycloakAdmin()
        .getKeycloakAdminClient()
        .users.findOne({
          id: user.ssoId,
        });
      user.email = kcUser?.email;
      user.username = kcUser?.username;
      user.enabled = kcUser?.enabled;
      user.emailVerified = kcUser?.emailVerified;
      user.createdTimestamp = kcUser?.createdTimestamp;
    }

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
    } else if (
      req.query.asTeam &&
      (await userHasPermissionsInAnyTeam(
        this.core.getPrisma(),
        req.kauth.grant.access_token.content.sub,
        ["users.list"],
        user.joinedBuildTeams.map((team) => team.slug)
      ))
    ) {
      res.send(user);
    } else {
      ERROR_NO_PERMISSION(req, res);
    }
  }

  /**
   * Get Keycloak information about a user
   */
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

  /**
   * Get all applications a user is allowed to review
   */
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
        user: { select: { id: true, name: true } },
      },
    });

    res.send(applications);
  }

  /**
   * Update User Information
   */
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

  /**
   * Generate a new verification code for verifying minecraft names
   */
  public async createVerificationCode(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    if (!req.user) {
      return ERROR_NO_PERMISSION(req, res);
    }

    const oldCodes = await this.core
      .getPrisma()
      .minecraftVerifications.deleteMany({ where: { userId: req.user.id } });

    const newCode = await this.core.getPrisma().minecraftVerifications.create({
      data: {
        user: { connect: { id: req.user.id } },
        code: Math.floor(Math.random() * 90000 + 10000),
        createdAt: new Date(),
      },
    });

    return res.send({ code: newCode.code, user: { id: req.user.id } });
  }

  public async redeemVerificationCode(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    const minecraftInfo = {
      uuid: req.body.uuid,
      name: req.body.name,
    };

    // Get Code Info
    const code = await this.core.getPrisma().minecraftVerifications.findUnique({
      where: { code: req.body.code },
      select: {
        code: true,
        user: {
          select: {
            id: true,
            ssoId: true,
            discordId: true,
            name: true,
            minecraft: true,
          },
        },
      },
    });

    if(!code) {
      return ERROR_GENERIC(req,res, 404, "Could not find the requested code. Make sure it is correct.")
    }

    // Update user profile in keycloak
    await this.core
      .getKeycloakAdmin()
      .getKeycloakAdminClient()
      .users.update(
        { id: code.user.ssoId },
        {
          attributes: {
            minecraft: minecraftInfo.name,
            minecraftVerified: true,
            minecraftUuid: minecraftInfo.uuid,
          },
        }
      );

    // Update user profile in db
    const user = await this.core.getPrisma().user.update({
      where: {
        id: code.user.id,
      },
      data: {
        minecraft: minecraftInfo.name,
      },
      select: {
        id: true,
        discordId: true,
        ssoId: true,
      },
    });


    // Get updated Keycloak info
    const kcUser = await this.core
      .getKeycloakAdmin()
      .getKeycloakAdminClient()
      .users.findOne({ id: user.ssoId });

    return res.send({
      message: "Linked successfully",
      code: code.code,
      minecraft: minecraftInfo,
      user: {
        ...user,
        username: kcUser.username,
      },
    });
  }

  /**
   * Get all permissions a user has
   */
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

  /**
   * Add permissions to a user
   */
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

  /**
   * Remove permissions from a user
   */
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

/**
 * Adds multiple permissions to a user
 * @param prisma Prisma Client
 * @param permissions List of permissions to add
 * @param user User
 * @param buildteam Optional BuildTeam ID
 * @returns created permissions
 */
async function addPermission(
  prisma: ExtendedPrismaClient,
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

/**
 * Removed multiple permissions from a user
 * @param prisma Prisma Client
 * @param permissions List of permissions to remove
 * @param user User
 * @param buildteam Optional BuildTeamID
 * @returns deleted permissions
 */
async function removePermission(
  prisma: ExtendedPrismaClient,
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

/**
 * Finds users based on discord, minecraft, id or ssoID
 * @param prisma Prisma CLient
 * @param kcAdmin Keycloak Admin Client
 * @param search Search query
 * @param limit Limit of results
 * @returns users that match the search query
 */
async function searchUser(
  prisma: ExtendedPrismaClient,
  kcAdmin: KcAdminClient,
  search: {
    discordId?: string;
    minecraft?: string;
    id?: string;
    ssoId?: string;
  },
  limit?: number
) {
  const users = await prisma.user.findMany({
    where: search,
    take: limit | 1,
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
      const kcUser = await kcAdmin.users.findOne({
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
  return kcUsers;
}

/**
 * Checks if a user has a permission in any buildteam
 * @param prisma Prisma Client
 * @param ssoId User ssoId
 * @param permission Permission to check
 * @param buildteams List of buildteams
 * @returns true if the user has the permission in any of the buildteams
 */
async function userHasPermissionsInAnyTeam(
  prisma: ExtendedPrismaClient,
  ssoId: string,
  permission: string[],
  buildteams: string[]
) {
  for (const team of buildteams) {
    if (await userHasPermissions(prisma, ssoId, permission, team)) {
      return true;
    }
  }
  return false;
}

export default UserController;
