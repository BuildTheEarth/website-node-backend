import { Request, Response } from "express";
import { body, check, param, query } from "express-validator";
import {
  checkUserPermission,
  checkUserPermissions,
} from "./utils/CheckUserPermissionMiddleware.js";

import { Keycloak } from "keycloak-connect";
import ApplicationController from "../../controllers/ApplicationController.js";
import BuildTeamController from "../../controllers/BuildTeamController.js";
import ClaimController from "../../controllers/ClaimController.js";
import ContactController from "../../controllers/ContactController.js";
import FaqController from "../../controllers/FAQController.js";
import GeneralController from "../../controllers/GeneralController.js";
import NewsletterController from "../../controllers/NewsletterController.js";
import ShowcaseController from "../../controllers/ShowcaseController.js";
import TokenRouteContoller from "../../controllers/TokenRouteController.js";
import UserController from "../../controllers/UserController.js";
import Web from "../Web.js";
import { checkTokenValidity } from "./utils/CheckTokenValidity.js";
import { RequestMethods } from "./utils/RequestMethods.js";
import Router from "./utils/Router.js";

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
    const router: Router = new Router(this.web, "v1");

    const buildTeamController = new BuildTeamController(this.web.getCore());
    const showcaseController = new ShowcaseController(this.web.getCore());
    const applicationController = new ApplicationController(this.web.getCore());
    const claimController = new ClaimController(this.web.getCore());
    const faqController = new FaqController(this.web.getCore());
    const userController = new UserController(this.web.getCore());
    const contactController = new ContactController(this.web.getCore());
    const newsletterController = new NewsletterController(this.web.getCore());
    const generalController = new GeneralController(this.web.getCore());
    const tokenRouteContoller = new TokenRouteContoller(this.web.getCore());

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
    router.addRoute(
      RequestMethods.GET,
      "/permissions",
      async (request, response) => {
        await generalController.getPermissions(request, response);
      }
    );
    router.addRoute(
      RequestMethods.POST,
      "/upload",
      async (request, response) => {
        await generalController.uploadImage(request, response);
      },
      this.web.getFileUpload().single("image")
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
      param("id")
    );
    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id/application/questions",
      async (request: Request, response: Response) => {
        await buildTeamController.getBuildTeamApplicationQuestions(
          request,
          response
        );
      },
      param("id")
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
      param("id"),
      body("questions"),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "team.application.edit",
        "id"
      )
    );
    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id/socials",
      async (request: Request, response: Response) => {
        await buildTeamController.getBuildTeamSocials(request, response);
      },
      param("id")
    );
    router.addRoute(
      RequestMethods.POST,
      "/buildteams/:id/socials",
      async (request: Request, response: Response) => {
        await buildTeamController.updateBuildTeamSocials(request, response);
      },
      param("id"),
      body("socials"),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "buildteam.socials.edit",
        "id"
      )
    );
    router.addRoute(
      RequestMethods.DELETE,
      "/buildteams/:team/socials/:id",
      async (request: Request, response: Response) => {
        await buildTeamController.deleteBuildTeamSocial(request, response);
      },
      param("team"),
      param("id"),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "buildteam.socials.edit",
        "team"
      )
    );
    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id/members",
      async (request: Request, response: Response) => {
        await buildTeamController.getBuildTeamMembers(request, response);
      },
      param("id"),
      checkUserPermissions(
        this.web.getCore().getPrisma(),
        ["permissions.add", "permissions.remove"],
        "id"
      )
    );
    router.addRoute(
      RequestMethods.DELETE,
      "/buildteams/:id/members",
      async (request: Request, response: Response) => {
        await buildTeamController.removeBuildTeamMember(request, response);
      },
      param("id"),
      body("user"),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "buildteam.members.edit",
        "id"
      )
    );
    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id/managers",
      async (request: Request, response: Response) => {
        await buildTeamController.getBuildTeamManagers(request, response);
      },
      param("id"),
      checkUserPermissions(
        this.web.getCore().getPrisma(),
        ["permissions.add", "permissions.remove"],
        "id"
      )
    );
    router.addRoute(
      RequestMethods.POST,
      "/buildteams/:id",
      async (request: Request, response: Response) => {
        await buildTeamController.updateBuildTeam(request, response);
      },
      param("id"),
      body("name").isString().optional(),
      body("icon").isURL().optional(),
      body("backgroundImage").isURL().optional(),
      body("invite").isURL().optional(),
      body("about").isString().optional(),
      body("location").isString().optional(),
      body("slug").isString().optional(),
      body("ip").isString().optional(),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "buildteam.settings.edit",
        "id"
      )
    );
    router.addRoute(
      RequestMethods.POST,
      "/buildteams/:id/token",
      async (request: Request, response: Response) => {
        await buildTeamController.generateBuildTeamToken(request, response);
      },
      param("id"),
      query("slug").optional()
      // Permission check later: Creator
    );

    /*
     *
     * Claim Routes
     *
     */

    router.addRoute(
      RequestMethods.GET,
      "/claims",
      async (request, response) => {
        await claimController.getClaims(request, response);
      }
    );
    router.addRoute(
      RequestMethods.GET,
      "/claims/geojson",
      async (request, response) => {
        await claimController.getClaimsGeoJson(request, response);
      }
    );
    router.addRoute(
      RequestMethods.GET,
      "/claims/:id",
      async (request, response) => {
        await claimController.getClaim(request, response);
      },
      param("id").isUUID()
    );
    router.addRoute(
      RequestMethods.POST,
      "/claims",
      async (request, response) => {
        await claimController.createClaim(request, response);
      },
      body("team").isString(),
      body("area").isArray().optional(),
      body("name").isString().optional(),
      body("finished").isBoolean().optional(),
      body("active").isBoolean().optional(),
      body("builders").isArray().optional()
    );
    router.addRoute(
      RequestMethods.POST,
      "/claims/:id",
      async (request, response) => {
        await claimController.updateClaim(request, response);
      },
      param("id").isUUID(),
      body("name").isString().optional(),
      body("finished").isBoolean().optional(),
      body("active").isBoolean().optional(),
      body("area").isArray().optional()
    );
    router.addRoute(
      RequestMethods.DELETE,
      "/claims/:id",
      async (request, response) => {
        await claimController.deleteClaim(request, response);
      },
      param("id").isUUID()
    );

    /*
     *
     * Showcase Routes
     *
     */

    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id/showcases",
      async (request, response) => {
        await showcaseController.getShowcases(request, response);
      },
      param("id")
    );
    router.addRoute(
      RequestMethods.GET,
      "/showcases",
      async (request, response) => {
        await showcaseController.getAllShowcases(request, response);
      }
    );
    router.addRoute(
      RequestMethods.GET,
      "/showcases/random",
      async (request, response) => {
        await showcaseController.getRandomShowcases(request, response);
      },
      query("limit").isNumeric()
    );
    router.addRoute(
      RequestMethods.DELETE,
      "/buildteams/:team/showcases/:id",
      async (request, response) => {
        await showcaseController.deleteShowcase(request, response);
      },
      param("team"),
      param("id").isUUID(),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "team.showcases.edit",
        "team"
      )
    );
    router.addRoute(
      RequestMethods.POST,
      "/buildteams/:id/showcases",
      async (request, response) => {
        await showcaseController.createShowcase(request, response);
      },
      param("id"),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "team.showcases.edit",
        "id"
      ),
      this.web.getFileUpload().single("image")
    );

    /*
     *
     * Application Routes
     *
     */

    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id/applications",
      async (request, response) => {
        await applicationController.getApplications(request, response);
      },
      param("id"),
      query("review").isBoolean().optional(),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "team.application.list",
        "id"
      )
    );
    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id/applications/user/:user",
      async (request, response) => {
        await applicationController.getUserApplications(request, response);
      },
      param("id"),
      param("user").isUUID()
    );
    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id/applications/:app",
      async (request, response) => {
        await applicationController.getApplication(request, response);
      },
      param("app").isUUID(),
      param("id"),
      query("pending").isBoolean().optional(),
      query("includeAnswers").isBoolean().optional(),
      query("includeUser").isBoolean().optional(),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "team.application.list",
        "id"
      )
    );
    router.addRoute(
      RequestMethods.POST,
      "/buildteams/:id/applications/:app",
      async (request, response) => {
        await applicationController.review(request, response);
      },
      param("app").isUUID(),
      param("id"),
      body("reason").isString().optional(),
      body("status").isString().isIn(["TRIAL", "ACCEPTED", "DECLINED"]),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "team.application.review",
        "id"
      )
    );
    router.addRoute(
      RequestMethods.POST,
      "/buildteams/:id/apply",
      async (request, response) => {
        await applicationController.apply(request, response);
      },
      query("trial").isBoolean().optional()
    );
    router.addRoute(
      RequestMethods.GET,
      "/applications/:id",
      async (request, response) => {
        await applicationController.getApplication(request, response);
      },
      param("id").isUUID(),
      query("includeBuildteam").isBoolean().optional(),
      query("includeReviewer").isBoolean().optional(),
      query("includeAnswers").isBoolean().optional()
      // Permission check later
    );
    router.addRoute(
      RequestMethods.POST,
      "/applications/:id",
      async (request, response) => {
        await applicationController.review(request, response);
      },
      param("id").isUUID(),
      body("isTrial").isBoolean(),
      body("claimActive").isBoolean(),
      body("status").isIn(["reviewing", "accepted", "declined"]),
      body("reason").isString().optional()
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
      RequestMethods.GET,
      "/faq/:id",
      async (request, response) => {
        await faqController.getFaqQuestion(request, response);
      }
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
    router.addRoute(
      RequestMethods.DELETE,
      "/faq/:id",
      async (request, response) => {
        await faqController.deleteFaqQuestions(request, response);
      },
      param("id").isUUID(),
      checkUserPermission(this.web.getCore().getPrisma(), "faq.remove")
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
      query("page").isNumeric().optional(),
      checkUserPermission(this.web.getCore().getPrisma(), "users.list")
    );
    router.addRoute(
      RequestMethods.GET,
      "/users/:id",
      async (request, response) => {
        await userController.getUser(request, response);
      },
      param("id").isUUID()
      // Permission check later
    );
    router.addRoute(
      RequestMethods.GET,
      "/users/:id/kc",
      async (request, response) => {
        await userController.getKeycloakUser(request, response);
      },
      param("id").isUUID()
      // Permission check later
    );
    router.addRoute(
      RequestMethods.GET,
      "/users/:id/review",
      async (request, response) => {
        await userController.getUserReviews(request, response);
      },
      param("id").isUUID()
      // Permission check later
    );
    router.addRoute(
      RequestMethods.POST,
      "/users/:id",
      async (request, response) => {
        await userController.updateUser(request, response);
      },
      param("id").isUUID(),
      body("email").isEmail().optional(),
      body("firstName").isString().optional(),
      body("lastName").isString().optional(),
      body("username").isString().optional(),
      body("name").isString().optional(),
      body("avatar").isString().optional()
      // Permission check later
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
    router.addRoute(
      RequestMethods.POST,
      "/users/:id/permissions",
      async (request, response) => {
        await userController.addPermission(request, response);
      },
      param("id"),
      body("permission").isString().optional(),
      body("permissions").isArray().optional(),
      query("buildteam").isString().optional()
      // Permission check later: permissions.add
    );
    router.addRoute(
      RequestMethods.DELETE,
      "/users/:id/permissions",
      async (request, response) => {
        await userController.removePermission(request, response);
      },
      param("id"),
      body("permission").isString().optional(),
      body("permissions").isArray().optional(),
      query("buildteam").isString().optional()
      // Permission check later: permissions.remove
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

    /*
     *
     * Newsletter Routes
     *
     */

    router.addRoute(
      RequestMethods.GET,
      "/newsletter",
      async (request, response) => {
        await newsletterController.getNewsletters(request, response);
      },
      param("page").optional()
    );
    router.addRoute(
      RequestMethods.GET,
      "/newsletter/:id",
      async (request, response) => {
        await newsletterController.getNewsletter(request, response);
      },
      param("id"),
      query("isIssue").optional()
    );
    router.addRoute(
      RequestMethods.POST,
      "/newsletter",
      async (request, response) => {
        await newsletterController.addNewsletter(request, response);
      },
      param("public").isBoolean().optional(),
      checkUserPermission(this.web.getCore().getPrisma(), "newsletter.add")
    );

    /*
     *
     * Public Routes
     *
     */

    router.addRoute(
      RequestMethods.GET,
      "/public/buildteams/:team/claims",
      async (request, response) => {
        await tokenRouteContoller.getClaims(request, response);
      },
      param("team"),
      query("page").isNumeric().optional(),
      query("withBuilders").isBoolean().optional(),
      checkTokenValidity(this.web.getCore().getPrisma(), "team")
    );
    router.addRoute(
      RequestMethods.GET,
      "/public/buildteams/:team/claims/:id",
      async (request, response) => {
        await tokenRouteContoller.getClaim(request, response);
      },
      param("team"),
      param("id"),
      query("withBuilders").isBoolean().optional(),
      checkTokenValidity(this.web.getCore().getPrisma(), "team")
    );
    router.addRoute(
      RequestMethods.POST,
      "/public/buildteams/:team/claimsbatch",
      async (request, response) => {
        await tokenRouteContoller.addClaims(request, response);
      },
      // body("data").isArray({ min: 1, max: 100 }),
      param("team"),
      checkTokenValidity(this.web.getCore().getPrisma(), "team")
    );
    router.addRoute(
      RequestMethods.POST,
      "/public/buildteams/:team/claims/:id",
      async (request, response) => {
        await tokenRouteContoller.updateClaim(request, response);
      },
      param("team"),
      param("id"),
      body("owner").isUUID().optional(),
      body("area").optional(),
      body("active").isBoolean().optional(),
      body("finished").isBoolean().optional(),
      body("name").isString().optional(),
      checkTokenValidity(this.web.getCore().getPrisma(), "team")
    );
    router.addRoute(
      RequestMethods.POST,
      "/public/buildteams/:team/claims",
      async (request, response) => {
        await tokenRouteContoller.addClaim(request, response);
      },
      param("team"),
      body("owner").isString(),
      body("builders").isArray({ max: 20 }).optional(),
      body("area"),
      body("active").isBoolean(),
      body("finished").isBoolean(),
      body("name").isString(),
      body("id").isUUID().optional(),
      checkTokenValidity(this.web.getCore().getPrisma(), "team")
    );
    router.addRoute(
      RequestMethods.DELETE,
      "/public/buildteams/:team/claims/:id",
      async (request, response) => {
        await tokenRouteContoller.removeClaim(request, response);
      },
      param("team"),
      checkTokenValidity(this.web.getCore().getPrisma(), "team")
    );

    router.addRoute(
      RequestMethods.GET,
      "/public/buildteams/:id/members",
      async (request, response) => {
        await buildTeamController.getBuildTeamMembers(request, response);
      },
      param("id"),
      query("page").isNumeric().optional(),
      checkTokenValidity(this.web.getCore().getPrisma(), "id")
    );
  }
}

export default Routes;
