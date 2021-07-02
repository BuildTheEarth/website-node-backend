import { NextFunction, Request, Response } from 'express';
import Core from '../Core';
import JWTController from '../util/auth/JWTController';

export default class Middlewares {
    private core: Core;

    private jwt: JWTController;

    constructor(core: Core, jwt: JWTController) {
      this.core = core;
      this.jwt = jwt;
    }

    requireAuth = (req: Request, res: Response, next: NextFunction) => {
      this.core.getLogger().debug('testtest');
      this.jwt.verifyToken();
      next();
    }
}
