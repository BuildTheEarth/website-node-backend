import { NextFunction, Request, Response } from "express";

import { PrismaClient } from "@prisma/client";
import Core from "../../../Core.js";

const checkNewUser = (prisma: PrismaClient, core: Core) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.kauth.grant) {
      next();
      return;
    }
    let user = await prisma.user.findUnique({
      where: {
        ssoId: req.kauth.grant.access_token.content.sub,
      },
    });
    console.log(user?.id);

    // If there is an user present in the DB -> Not first request
    if (user) {
      req.user = user;
      const kcuser = await core
        .getKeycloakAdmin()
        .getKeycloakAdminClient()
        .users.findOne({
          id: req.kauth.grant.access_token.content.sub,
        });

      // User has KC IdPs linked
      if (kcuser.federatedIdentities.length > 0) {
        const discordIdentity = kcuser.federatedIdentities.find(
          (fi) => fi.identityProvider === "discord"
        );

        // User has discord IdP linked
        if (discordIdentity) {
          // Discord ID updated or not set
          if (user.discordId !== discordIdentity.userId) {
            const user = await prisma.user.update({
              where: {
                ssoId: req.kauth.grant.access_token.content.sub,
              },
              data: {
                discordId: discordIdentity.userId,
              },
            });
            req.user = user;
          }
        }
        // else {

        //   const user = await prisma.user.update({
        //     where: {
        //       ssoId: req.kauth.grant.access_token.content.sub,
        //     },
        //     data: {
        //       discordId: "",
        //     },
        //   });
        //   req.user = user;
        // }
      } else {
        // Set Discord ID to "" when no Discord Linked
        const user = await prisma.user.update({
          where: {
            ssoId: req.kauth.grant.access_token.content.sub,
          },
          data: {
            discordId: "",
          },
        });
        req.user = user;
      }
      next();
      return;
    } else {
      // Get KC user
      const kcuser = await core
        .getKeycloakAdmin()
        .getKeycloakAdminClient()
        .users.findOne({
          id: req.kauth.grant.access_token.content.sub,
        });

      // User has discord IdP linked
      const discordIdentity = kcuser.federatedIdentities.find(
        (fi) => fi.identityProvider === "discord"
      );

      // !! ONLY TO MIGRATE OLD WEBSITE BUILDERS
      const oldUser = await prisma.user.findFirst({
        where: { ssoId: "o_" + discordIdentity.userId },
      });
      console.log(oldUser?.ssoId);
      if (oldUser) {
        // Update migrated user
        await prisma.user.update({
          where: {
            id: oldUser.id,
          },
          data: {
            ssoId: req.kauth.grant.access_token.content.sub,
          },
        });
        req.user = oldUser;
      } else {
        // Create new user
        const user = await prisma.user.create({
          data: {
            ssoId: req.kauth.grant.access_token.content.sub,
            discordId: discordIdentity ? discordIdentity.userId : undefined,
          },
        });
        req.user = user;
      }

      // Create default Permission
      await prisma.userPermission.createMany({
        data: [
          {
            userId: req.user.id,
            permissionId: "account.info",
          },
          {
            userId: req.user.id,
            permissionId: "account.edit",
          },
        ],
      });
    }
    next();
  };
};

export default checkNewUser;
