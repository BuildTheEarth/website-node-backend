import * as Sentry from "@sentry/node";

import express, { Request, Response } from "express";

import AdminController from "../controllers/AdminController.js";
import ApplicationController from "../controllers/ApplicationController.js";
import BuildTeamController from "../controllers/BuildTeamController.js";
import CalendarController from "../controllers/CalendarController.js";
import ClaimController from "../controllers/ClaimController.js";
import ContactController from "../controllers/ContactController.js";
import Core from "../Core.js";
import { ERROR_GENERIC } from "../util/Errors.js";
import FaqController from "../controllers/FAQController.js";
import GeneralController from "../controllers/GeneralController.js";
import NewsletterController from "../controllers/NewsletterController.js";
import Routes from "./routes/index.js";
import ShowcaseController from "../controllers/ShowcaseController.js";
import TokenRouteContoller from "../controllers/TokenRouteController.js";
import UserController from "../controllers/UserController.js";
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
  controllers: {
    general: GeneralController;
    buildTeam: BuildTeamController;
    showcase: ShowcaseController;
    application: ApplicationController;
    claim: ClaimController;
    faq: FaqController;
    user: UserController;
    contact: ContactController;
    newsletter: NewsletterController;
    admin: AdminController;
    tokenRoute: TokenRouteContoller;
    calendar: CalendarController;
  };

  fileStorage: any;
  fileUpload: any;

  constructor(core: Core) {
    this.app = express();
    this.core = core;
    this.fileStorage = multer.memoryStorage();
    this.fileUpload = multer({ storage: this.fileStorage });
    this.controllers = this.initControllers(core);
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

    Sentry.setupExpressErrorHandler(this.app);

    this.app.use("/api/v1/*", (req: Request, res: Response) => {
      return ERROR_GENERIC(req, res, 404, "Not Found");
    });
    this.app.use("*", (req: Request, res: Response) => {
      return ERROR_GENERIC(req, res, 404, "Not Found. Use /api/v1");
    });

    this.app.listen(this.getPort(), () => {
      this.core
        .getLogger()
        .info(`Starting webserver on port ${this.getPort()}`);
    });
  }

  private initControllers(core: Core) {
    return {
      general: new GeneralController(core),
      buildTeam: new BuildTeamController(core),
      showcase: new ShowcaseController(core),
      application: new ApplicationController(core),
      claim: new ClaimController(core),
      faq: new FaqController(core),
      user: new UserController(core),
      contact: new ContactController(core),
      newsletter: new NewsletterController(core),
      tokenRoute: new TokenRouteContoller(core),
      admin: new AdminController(core),
      calendar: new CalendarController(core),
    };
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

  public getControllers() {
    return this.controllers;
  }
}

export default Web;
