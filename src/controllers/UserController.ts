import { Request, Response } from "express";

import Core from "../Core.js";
import { PrismaClient } from "@prisma/client";
import { userHasPermissions } from "../web/routes/utils/CheckUserPermissionMiddleware.js";
import { validationResult } from "express-validator";

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
          id: req.query.buildteam as string,
        },
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
          id: req.query.buildteam as string,
        },
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
