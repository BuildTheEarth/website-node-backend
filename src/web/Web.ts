import express, { Request, Response } from "express";

import Core from "../Core.js";
import { ERROR_GENERIC } from "../util/Errors.js";
import Routes from "./routes/index.js";
import bodyParser from "body-parser";
import checkNewUser from "./routes/utils/CheckNewUserMiddleware.js";
import cors from "cors";
import metricsMiddleware from "./routes/utils/MetricsMiddleware.js";
import multer from "multer";
import session from "express-session";

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

    this.routes = new Routes(this);

    this.app.use("/api/v1/*", (_req: Request, res: Response) => {
      return ERROR_GENERIC(res, 404, "Not Found");
    });
    this.app.use("*", (_req: Request, res: Response) => {
      return ERROR_GENERIC(res, 404, "Not Found. Use /api/v1");
    });

    this.app.listen(this.getPort(), () => {
      this.core
        .getLogger()
        .info(`Starting webserver on port ${this.getPort()}`);
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
