import * as express from 'express';
import * as bodyParser from 'body-parser';
import Core from '../Core';
import Routes from './routes';
import * as session from "express-session";

class Web {
    app;

    core: Core;

    routes: Routes;


    constructor(core: Core) {
        this.app = express();
        this.core = core;
    }

    public startWebserver() {
        this.app.use(bodyParser.json());
        this.app.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: true,
            store: this.core.memoryStore
        }));

        this.app.use(this.core.getKeycloak().middleware({
            logout: '/logout',
            admin: '/'
        }));
        this.core.getLogger().debug("Enabled keycloak-connect adapter")



        this.app.listen(this.getPort(), () => {
            this.core.getLogger().info(`Starting webserver on port ${this.getPort()}`);
            this.routes = new Routes(this);

        });
    }

    public getPort() {
        return process.env.WEBPORT;
    }

    public getApp() {
        return this.app;
    }

    public getCore() {
        return this.core;
    }

    public getKeycloak() {
        return this.core.getKeycloak();
    }
}

export default Web;