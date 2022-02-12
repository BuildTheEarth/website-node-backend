import {NextFunction, Request, Response} from "express";
import {PrismaClient} from "@prisma/client";
import Core from "../../../Core";

const checkNewUser = (prisma: PrismaClient, core: Core) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const kcuser = await core.getKeycloakAdmin().getKeycloakAdminClient().users.findOne({
            id: req.kauth.grant.access_token.content.sub
        })
        core.getLogger().debug(kcuser)
        const user = await prisma.user.findUnique({
            where: {
                ssoId: req.kauth.grant.access_token.content.sub
            }
        })
        if(user) {
            if(user.discordId !== req.kauth.grant.access_token.content.discordId) {
                const user = await prisma.user.update({
                    where: {
                        ssoId: req.kauth.grant.access_token.content.sub
                    },
                    data: {
                        discordId: req.kauth.grant.access_token.content.discordId
                    }
                })
            }
            next();
            return;
        } else {
            await prisma.user.create({
                data: {
                    ssoId: req.kauth.grant.access_token.content.sub,
                    discordId: req.kauth.grant.access_token.content.discordId
                }
            })
        }
        next()
    }

}

export default checkNewUser;
