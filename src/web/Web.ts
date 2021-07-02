import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as passport from 'passport';
import Core from '../Core';
import Routes from './routes';
import Middlewares from './Middlewares';

class Web {
    app;

    core: Core;

    routes: Routes;

    middlewares: Middlewares;

    constructor(core: Core) {
      this.app = express();
      this.core = core;
      this.middlewares = new Middlewares(this.core);
    }

    public startWebserver() {
      this.app.use(passport.initialize());
      this.app.use(bodyParser.json());

      this.app.listen(this.getPort(), () => {
        this.core.getLogger().info(`Starting webserver on port ${this.getPort()}`);
        this.routes = new Routes(this, this.middlewares);

        // set render engine
        this.app.set('view engine', 'pug');
        this.app.set('views', 'src/web/views');
      });
    }

    public getPort() {
      return process.env.webport;
    }

    public getApp() {
      return this.app;
    }

    public getCore() {
      return this.core;
    }
}

export default Web;
