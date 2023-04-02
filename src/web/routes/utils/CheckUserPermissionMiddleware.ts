import { NextFunction, Request, Response } from "express";

import Core from "../../../Core.js";
import { PrismaClient } from "@prisma/client";
import { minimatch } from "minimatch";

export const checkUserPermission = (
  prisma: PrismaClient,
  permission: string,
  buildteam?: string
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
        buildTeam: { id: buildteam },
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

export async function userHasPermission(
  prisma,
  ssoId: string,
  permission: string,
  buildteam?: string
) {
  let user = await prisma.user.findUnique({
    where: {
      ssoId,
    },
  });

  let permissions = await prisma.userPermission.findMany({
    where: {
      userId: user.id,
      buildTeam: { id: buildteam },
    },
  });

  if (permissions.find((p) => minimatch(permission, p.permission))) return true;
  return false;
}
