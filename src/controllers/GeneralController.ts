import { Request, Response } from "express";
import { ERROR_GENERIC, ERROR_VALIDATION } from "../util/Errors.js";

import { validationResult } from "express-validator";
import Core from "../Core.js";

class GeneralController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getAccount(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    const { exp, iat, sub, email_verified, preferred_username, email } =
      req.kauth.grant.access_token.content;
    const user = await this.core
      .getPrisma()
      .user.findFirst({ where: { ssoId: sub } });

    if (!user) return ERROR_GENERIC(req, res, 500, "Unidentified User.");

    const userPermissions = await this.core
      .getPrisma()
      .userPermission.findMany({
        where: { user: user },
        include: {
          user: false,
          permission: true,
          buildTeam: { select: { slug: true } },
        },
      });

    res.send({
      id: user.id,
      ssoId: user.ssoId,
      discordId: user.discordId,
      username: preferred_username,
      email,
      emailVerified: email_verified,
      avatar: user.avatar,
      auth: {
        exp: { unix: exp, readable: new Date(exp * 1000).toISOString() },
        iat: { unix: iat, readable: new Date(iat * 1000).toISOString() },
      },
      permissions: userPermissions.map((p) => ({
        ...p,
        permission: p.permission.id,
        buildTeamSlug: p.buildTeam && p.buildTeam?.slug,
      })),
    });
  }

  public async getPermissions(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    const permissions = await this.core.getPrisma().permisision.findMany();
    res.send(permissions);
  }

  public async uploadImage(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    let opts = undefined;

    if (!req.kauth) {
      return ERROR_GENERIC(req, res, 500, "Unidentified User.");
    }

    if (req.query.claim) {
      opts = { Claim: { connect: { id: req.query.claim as string } } };
    }

    const upload = await this.core.getAWS().uploadFile(req.file, opts);

    res.send(upload);
  }

  public async setJsonStore(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    if (!req.kauth) {
      return ERROR_GENERIC(req, res, 500, "Unidentified User.");
    }

    const id = req.params.id

    if (!id) {
      return ERROR_GENERIC(req, res, 404, "ID not found.");
    }

    const jsonBody = req.body

    if (!jsonBody) {
      return ERROR_GENERIC(req, res, 404, "Body not found.");
    }


    const upload = await this.core.getPrisma().jsonStore.findUnique({
      where: {
        id: id,
      }
    })

    if (!upload) {
        await this.core.getPrisma().jsonStore.create({
          data: {
            id: id,
            data: jsonBody
          }
        })
    } else {
      await this.core.getPrisma().jsonStore.update({
        where: {
          id: id
        },
        data: {
          id: id,
          data: jsonBody
        }
      })
    }

    res.send(jsonBody)
  }

  public async getJsonStore(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    if (!req.kauth) {
      return ERROR_GENERIC(req, res, 500, "Unidentified User.");
    }

    const id = req.params.id

    if (!id) {
      return ERROR_GENERIC(req, res, 404, "ID not found.");
    }


    const upload = await this.core.getPrisma().jsonStore.findUnique({
      where: {
        id: id,
      },
      select: {
        data: true,
      },
    })

    if (!upload) {
      return ERROR_GENERIC(req, res, 404, "ID not found.");
    }

    res.send(upload.data)

  }

}

export default GeneralController;
