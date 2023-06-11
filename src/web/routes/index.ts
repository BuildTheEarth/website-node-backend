import { Request, Response, response } from "express";
import { body, param, query } from "express-validator";

import BuildTeamController from "../../controllers/BuildTeamController.js";
import ContactController from "../../controllers/ContactController.js";
import FaqController from "../../controllers/FAQController.js";
import GeneralController from "../../controllers/GeneralController.js";
import { Keycloak } from "keycloak-connect";
import { RequestMethods } from "./utils/RequestMethods.js";
import Router from "./utils/Router.js";
import UserController from "../../controllers/UserController.js";
import Web from "../Web.js";
import { checkUserPermission } from "./utils/CheckUserPermissionMiddleware.js";

class Routes {
  app;

  web: Web;

  keycloak: Keycloak;

  constructor(web: Web) {
    web.getCore().getLogger().info("Registering API routes");
    this.web = web;
    this.app = web.getApp();
    this.keycloak = this.web.getKeycloak();
    this.registerRoutes();
  }

  private registerRoutes() {
    const legacyRouter: Router = new Router(this.web, "");
    const router: Router = new Router(this.web, "v1");

    const buildTeamController = new BuildTeamController(this.web.getCore());
    const faqController = new FaqController(this.web.getCore());
    const userController = new UserController(this.web.getCore());
    const contactController = new ContactController(this.web.getCore());
    const generalController = new GeneralController(this.web.getCore());

    legacyRouter.addRoute(
      RequestMethods.GET,
      "modpack/images",
      (request, response) => {
        response.send({
          "1": {
            url: "https://i.imgur.com/N5cplwx.jpeg",
            credit: "waggiswagen#2266, Knäggi#4895 render: jo_kil#1977",
          },
          "2": {
            url: "https://i.imgur.com/tGtWJGk.jpeg",
            credit: "Woesh3#1155",
          },
          "3": {
            url: "https://i.imgur.com/yxEWCdQ.jpeg",
            credit: "Juancy23#9223",
          },
          "4": {
            url: "https://i.imgur.com/yQjMRlr.jpeg",
            credit:
              "Leander#2813, Grischbrei#6173, Norwod#9035 & DasBirnenDing#1574",
          },
          "5": {
            url: "https://i.imgur.com/9zqFHxa.png",
            credit:
              "Schnieven#0083, XilefHD#7198, copac#6194, render: XilefHD#7198",
          },
          logo: { url: "https://i.imgur.com/ih6BF72.png", credit: null },
        });
      }
    );

    router.addRoute(RequestMethods.GET, "/healthcheck", (request, response) => {
      response.send({ status: "up" });
    });

    router.addRoute(
      RequestMethods.GET,
      "/account",
      async (request, response) => {
        await generalController.getAccount(request, response);
      },
      checkUserPermission(this.web.getCore().getPrisma(), "account.info")
    );

    /*
     *
     * Build Team Routes
     *
     */

    router.addRoute(
      RequestMethods.GET,
      "/buildteams",
      async (request, response) => {
        await buildTeamController.getBuildTeams(request, response);
      },
      query("page").isNumeric().optional()
    );

    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id",
      async (request, response) => {
        await buildTeamController.getBuildTeam(request, response);
      },
      param("id").isUUID()
    );

    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id/application/questions",
      async (request: Request, response: Response) => {
        await buildTeamController.getBuildTeamApplicationQuestion(
          request,
          response
        );
      },
      param("id").isUUID()
    );

    router.addRoute(
      RequestMethods.POST,
      "/buildteams/:id/application/questions",
      async (request: Request, response: Response) => {
        await buildTeamController.updateBuildTeamApplicationQuestions(
          request,
          response
        );
      },
      param("id").isUUID(),
      body("questions")
      //checkUserPermission(
      //    this.web.getCore().getPrisma(),
      //    "buildteam.application.edit"
      //  )
    );

    router.addRoute(
      RequestMethods.POST,
      "/buildteams/:id",
      async (request: Request, response: Response) => {
        await buildTeamController.updateBuildTeamApplicationQuestions(
          request,
          response
        );
      },
      param("id").isUUID(),
      body("name").isString().optional(),
      body("icon").isURL().optional(),
      body("backgroundImage").isURL().optional(),
      body("invite").isURL().optional(),
      body("about").isString().optional(),
      body("location").isString().optional(),
      body("slug").isString().optional(),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "buildteam.edit",
        "params.id"
      )
    );

    /*
     *
     * FAQ Routes
     *
     */

    router.addRoute(
      RequestMethods.GET,
      "/faq",
      async (request, response) => {
        await faqController.getFaqQuestions(request, response);
      },
      query("page").isNumeric().optional()
    );
    router.addRoute(
      RequestMethods.POST,
      "/faq",
      async (request, response) => {
        await faqController.addFaqQuestion(request, response);
      },
      body("question"),
      body("answer"),
      checkUserPermission(this.web.getCore().getPrisma(), "faq.add")
    );
    router.addRoute(
      RequestMethods.POST,
      "/faq/:id",
      async (request, response) => {
        await faqController.editFaqQuestion(request, response);
      },
      param("id").isUUID(),
      body("answer").isString().optional(),
      body("question").isString().optional(),
      body("links").isArray().optional(),
      checkUserPermission(this.web.getCore().getPrisma(), "faq.edit")
    );

    /*
     *
     * User Routes
     *
     */

    router.addRoute(
      RequestMethods.GET,
      "/users",
      async (request, response) => {
        await userController.getUsers(request, response);
      },
      query("page").isNumeric().optional()
      //checkUserPermission(this.web.getCore().getPrisma(), "users.list")
    );
    router.addRoute(
      RequestMethods.GET,
      "/users/:id/permissions",
      async (request, response) => {
        await userController.getPermissions(request, response);
      },
      param("id"),
      checkUserPermission(this.web.getCore().getPrisma(), "users.list")
    );

    /*
     *
     * Contact Routes
     *
     */
    router.addRoute(
      RequestMethods.GET,
      "/contacts",
      async (request, response) => {
        await contactController.getContacts(request, response);
      }
    );
    router.addRoute(
      RequestMethods.POST,
      "/contacts",
      async (request, response) => {
        await faqController.addFaqQuestion(request, response);
      },
      body("name"),
      body("role"),
      body("discord").optional(),
      body("email").isEmail().optional(),
      body("avatar").isURL().optional(),
      checkUserPermission(this.web.getCore().getPrisma(), "contacts.add")
    );
    router.addRoute(
      RequestMethods.POST,
      "/contacts/:id",
      async (request, response) => {
        await faqController.editFaqQuestion(request, response);
      },
      param("id").isUUID(),
      body("name").optional(),
      body("role").optional(),
      body("discord").optional(),
      body("email").isEmail().optional(),
      body("avatar").isURL().optional(),
      checkUserPermission(this.web.getCore().getPrisma(), "contacts.edit")
    );
  }
}

export default Routes;
