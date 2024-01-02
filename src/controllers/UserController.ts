import { ApplicationStatus, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

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
      return res.status(400).json({ errors: errors.array() });
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

  public async getUser(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.kauth.grant)
      return res.status(401).send("You don't have permission to do this!");

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
            claim: { select: { id: true } },
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
      res.status(401).send("You don't have permission to do this!");
    }
  }

  public async getKeycloakUser(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.kauth.grant)
      return res.status(401).send("You don't have permission to do this!");

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
      res.status(401).send("You don't have permission to do this!");
    }
  }

  public async getUserReviews(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.kauth.grant) {
      return res.status(401).json("You are not permited to do this!");
    }
    const user = await this.core.getPrisma().user.findFirst({
      where: {
        id: req.params.id,
      },
    });

    if (user.ssoId != req.kauth.grant.access_token.content.sub) {
      return res.status(401).json("You are not permited to do this!");
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
      return res.status(400).json({ errors: errors.array() });
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
      return res.status(400).json({ errors: errors.array() });
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
      return res.status(400).json({ errors: errors.array() });
    }

    if (!(req.body.permission || req.body.permissions)) {
      res.status(400).send({
        code: 400,
        message: "Missing permission or permissions body values",
        translationKey: "400",
      });
    }
    const permissions = req.body.permissions || [req.body.permission];
    const userId = req.params.id;

    if (req.query.buildteam) {
      if (
        !(await userHasPermissions(
          this.core.getPrisma(),
          req.kauth.grant.access_token.content.sub,
          ["permission.add"],
          req.query.buildTeam as string
        ))
      ) {
        return res.status(401).send("You don't have permission to do this!");
      }

      const buildteam = await this.core.getPrisma().buildTeam.findFirst({
        where: {
          slug: req.query.buildteam as string,
        },
        select:{token:false,id:true}
      });

      if (!buildteam) {
        res.status(404).send({
          code: 404,
          message: "Buildteam does not exit.",
          translationKey: "404",
        });
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
        return res.status(401).send("You don't have permission to do this!");
      }

      res.send(await addPermission(this.core.getPrisma(), permissions, userId));
    }
  }

  public async removePermission(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!(req.body.permission || req.body.permissions)) {
      res.status(400).send({
        code: 400,
        message: "Missing permission or permissions body values",
        translationKey: "400",
      });
    }
    const permissions = req.body.permissions || [req.body.permission];
    const userId = req.params.id;

    if (req.query.buildteam) {
      if (
        !(await userHasPermissions(
          this.core.getPrisma(),
          req.kauth.grant.access_token.content.sub,
          ["permission.remove"],
          req.query.buildTeam as string
        ))
      ) {
        return res.status(401).send("You don't have permission to do this!");
      }

      const buildteam = await this.core.getPrisma().buildTeam.findFirst({
        where: {
          slug: req.query.buildteam as string,
        },
        select: { token: false, id: true },
      });

      if (!buildteam) {
        res.status(404).send({
          code: 404,
          message: "Buildteam does not exit.",
          translationKey: "404",
        });
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
        return res.status(401).send("You don't have permission to do this!");
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
