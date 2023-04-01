import { NextFunction, Request, Response } from "express";

import Core from "../../../Core.js";
import { PrismaClient } from "@prisma/client";
import { minimatch } from "minimatch";

export const checkUserPermission = (
  prisma: PrismaClient,
  permission: string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.kauth.grant) {
      res.status(401).send("You don't have permission to do this!");
      return;
    }

    let user = await prisma.user.findUnique({
      where: {
        ssoId: req.kauth.grant.access_token.content.sub,
      },
    });

    let permissions = await prisma.userPermission.findMany({
      where: {
        userId: user.id,
      },
    });

    if (permissions.find((p) => minimatch(permission, p.permission))) {
      next();
      return;
    } else {
      res.status(403).send("You don't have permission to do this!");
      return;
    }
  };
};
