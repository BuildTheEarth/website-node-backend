import * as blurhash from "blurhash";

import { Request, Response } from "express";

import Core from "../Core.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { parse } from "path";
import sharp from "sharp";
import { validationResult } from "express-validator";

class GeneralController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getAccount(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { exp, iat, sub, email_verified, preferred_username, email } =
      req.kauth.grant.access_token.content;
    const user = await this.core
      .getPrisma()
      .user.findFirst({ where: { ssoId: sub } });

    if (!user)
      return res.status(404).json({
        code: 404,
        message: "Unidentified User",
        translationKey: "404",
      });

    const userPermissions = await this.core
      .getPrisma()
      .userPermission.findMany({
        where: { user: user },
        include: { user: false, permission: true },
      });

    res.send({
      id: user.id,
      ssoId: user.ssoId,
      discordId: user.discordId,
      username: preferred_username,
      email,
      emailVerified: email_verified,
      auth: {
        exp: { unix: exp, readable: new Date(exp * 1000).toISOString() },
        iat: { unix: iat, readable: new Date(iat * 1000).toISOString() },
      },
      permissions: userPermissions.map((p) => ({
        ...p,
        permission: p.permission.id,
      })),
    });
  }

  public async getPermissions(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const permissions = await this.core.getPrisma().permisision.findMany();
    res.send(permissions);
  }

  public async uploadImage(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const upload = await this.core.getAWS().uploadFile(req.file);

    res.send(upload);
  }
}

export default GeneralController;
