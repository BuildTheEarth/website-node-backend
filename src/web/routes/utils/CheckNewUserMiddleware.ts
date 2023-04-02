import {NextFunction, Request, Response} from "express";

import Core from "../../../Core.js";
import { PrismaClient } from "@prisma/client";

const checkNewUser = (prisma: PrismaClient, core: Core) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await prisma.user.findUnique({
      where: {
        ssoId: req.kauth.grant.access_token.content.sub,
      },
    });
    if (user) {
      const kcuser = await core
        .getKeycloakAdmin()
        .getKeycloakAdminClient()
        .users.findOne({
          id: req.kauth.grant.access_token.content.sub,
        });
      if (kcuser.federatedIdentities.length > 0) {
        const discordIdentity = kcuser.federatedIdentities.find(
          (fi) => fi.identityProvider === "discord"
        );
        if (discordIdentity) {
          if (user.discordId !== discordIdentity.userId) {
            const user = await prisma.user.update({
              where: {
                ssoId: req.kauth.grant.access_token.content.sub,
              },
              data: {
                discordId: discordIdentity.userId,
              },
            });
          }
        } else {
          const user = await prisma.user.update({
            where: {
              ssoId: req.kauth.grant.access_token.content.sub,
            },
            data: {
              discordId: "",
            },
          });
        }
      } else {
        const user = await prisma.user.update({
          where: {
            ssoId: req.kauth.grant.access_token.content.sub,
          },
          data: {
            discordId: "",
          },
        });
      }
      next();
      return;
    } else {
      const kcuser = await core
        .getKeycloakAdmin()
        .getKeycloakAdminClient()
        .users.findOne({
          id: req.kauth.grant.access_token.content.sub,
        });
      const discordIdentity = kcuser.federatedIdentities.find(
        (fi) => fi.identityProvider === "discord"
      );
      const user = await prisma.user.create({
        data: {
          ssoId: req.kauth.grant.access_token.content.sub,
          discordId: discordIdentity ? discordIdentity.userId : undefined,
        },
      });
      await prisma.userPermission.create({
        data: {
          user: { connect: { id: user.id } },
          permission: "account.info",
        },
      });
    }
    next();
  };
};

export default checkNewUser;
