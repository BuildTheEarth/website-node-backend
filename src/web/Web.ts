import * as express from 'express';
import Core from "../Core";
import Routes from "./routes";

class Web {
    app;
    core: Core;
    routes: Routes;

    constructor(core: Core) {
        this.app = express();
        this.core = core;
    }

    public startWebserver() {
        this.app.listen(this.getPort(), () => {
            this.core.getLogger().info(`Starting webserver on port ${this.getPort()}`)
            this.routes = new Routes(this);
        })
    }

    public getPort() {
        return process.env.webPort;
    }

    public getApp() {
        return this.app;
    }

    public getCore() {
        return this.core;
    }


}

export default Web;
