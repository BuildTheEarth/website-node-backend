import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import Core from '../../Core';

export default class JWTController {
    private secret: string;

    private core: Core;

    constructor(secret: string, core: Core) {
      this.secret = secret;
      this.core = core;
      this.core.getLogger().debug('Initializing JWTController...');
    }

    public verifyToken = (token: string): string | JwtPayload => {
      try {
        return jwt.verify(token, this.secret);
      } catch (e) {
        this.core.getLogger().error(e);
      }
    }

    public createToken = (payload: object): string => jwt.sign(payload, this.secret, { expiresIn: '5h' })
}
