import { Request, Response } from "express";

import Core from "../Core.js";
import { questions } from "../util/QuestionData.js";
import { validationResult } from "express-validator";
import yup from "yup";

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
        include: { user: false },
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
      permissions: userPermissions,
    });
  }
}

export default GeneralController;
