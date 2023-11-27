import { Prisma, PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

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

    if (
      userHasPermissions(
        prisma,
        req.kauth.grant.access_token.content.sub,
        [permission],
        buildteam ? req.params[buildteam] : undefined
      )
    ) {
      next();
      return;
    } else {
      res.status(403).send("You don't have permission to do this!");
      return;
    }
  };
};

export const checkUserPermissions = (
  prisma: PrismaClient,
  permissions: string[],
  buildteam?: string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.kauth.grant) {
      res.status(401).send("You don't have permission to do this!");
      return;
    }

    if (
      userHasPermissions(
        prisma,
        req.kauth.grant.access_token.content.sub,
        permissions,
        buildteam ? req.params[buildteam] : undefined
      )
    ) {
      next();
      return;
    } else {
      res.status(403).send("You don't have permission to do this!");
      return;
    }
  };
};

export async function userHasPermissions(
  prisma: PrismaClient,
  ssoId: string,
  permission: string[],
  buildteam?: string
) {
  let user = await prisma.user.findUnique({
    where: {
      ssoId,
    },
  });

  if (!user) return false;

  let permissions = await prisma.userPermission.findMany({
    where: {
      userId: user.id,
    },
    include: { permission: true, buildTeam: { select: { slug: true } } },
  });

  const foundPermissions = permissions
    .filter(
      (p) =>
        p.buildTeamId == null ||
        p.buildTeamId == buildteam ||
        p.buildTeam.slug == buildteam
    )
    .filter((p) => permission.some((perm) => minimatch(perm, p.permission.id)));
  if (
    foundPermissions != null &&
    foundPermissions != undefined &&
    foundPermissions.length > 0
  ) {
    return true;
  }
  return false;
}
