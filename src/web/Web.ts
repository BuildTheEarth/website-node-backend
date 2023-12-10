import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import session from "express-session";
import multer from "multer";
import Core from "../Core.js";
import Routes from "./routes/index.js";
import checkNewUser from "./routes/utils/CheckNewUserMiddleware.js";
import metricsMiddleware from "./routes/utils/MetricsMiddleware.js";
class Web {
  app;

  core: Core;

  routes: Routes;

  fileStorage: any;
  fileUpload: any;

  constructor(core: Core) {
    this.app = express();
    this.core = core;
    this.fileStorage = multer.memoryStorage();
    this.fileUpload = multer({ storage: this.fileStorage });
  }

  public startWebserver() {
    this.app.use(bodyParser.json());
    this.app.use(metricsMiddleware);
    this.app.use(
      session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        store: this.core.memoryStore,
      })
    );
    this.app.use(cors());

    this.app.use(
      this.core.getKeycloak().middleware({
        logout: "/logout",
        admin: "/",
      })
    );
    this.core.getLogger().debug("Enabled keycloak-connect adapter");
    this.app.use(checkNewUser(this.getCore().getPrisma(), this.getCore()));

    this.app.listen(this.getPort(), () => {
      this.core
        .getLogger()
        .info(`Starting webserver on port ${this.getPort()}`);
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

  public getFileUpload() {
    return this.fileUpload;
  }
}

export default Web;
