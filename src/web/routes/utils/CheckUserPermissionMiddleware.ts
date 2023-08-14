import {NextFunction, Request, Response} from "express";

import {PrismaClient} from "@prisma/client";
import {minimatch} from "minimatch";

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
          userHasPermission(
            prisma,
            req.kauth.grant.access_token.content.sub,
            permission,
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

    if (!user) return false;

    let permissions = await prisma.userPermission.findMany({
        where: {
            userId: user.id,
        },
    });

    const foundPermissions = permissions
        .filter((p) => p.buildTeamId == null || p.buildTeamId == buildteam)
        .find((p) => minimatch(permission, p.permission));
    console.log(foundPermissions);
    if (foundPermissions != null && foundPermissions != undefined) {
        return true;
    }
    return false;
}
