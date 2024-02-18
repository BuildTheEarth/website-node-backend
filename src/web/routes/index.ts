import { Request, Response } from "express";
import { body, check, param, query } from "express-validator";
import turf, {
  CoordinateType,
  toPolygon,
  useCoordinateInput,
} from "../../util/Coordinates.js";
import {
  checkUserPermission,
  checkUserPermissions,
} from "./utils/CheckUserPermissionMiddleware.js";

import { Keycloak } from "keycloak-connect";
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
    const controllers = this.web.getControllers();

    router.addRoute(RequestMethods.GET, "/healthcheck", (request, response) => {
      response.send({ status: "up" });
    });
    router.addRoute(
      RequestMethods.GET,
      "/account",
      async (request, response) => {
        await controllers.general.getAccount(request, response);
      },
      checkUserPermission(this.web.getCore().getPrisma(), "account.info")
    );
    router.addRoute(
      RequestMethods.GET,
      "/permissions",
      async (request, response) => {
        await controllers.general.getPermissions(request, response);
      }
    );
    router.addRoute(
      RequestMethods.POST,
      "/upload",
      async (request, response) => {
        await controllers.general.uploadImage(request, response);
      },
      query("claim").isUUID().optional(),
      this.web.getFileUpload().single("image")
    );
    router.addRoute(
      RequestMethods.POST,
      "/coords",
      (request, response) => {
        response.send({
          input: request.body.coords__old,
          parsed: request.body.coords,
          polygon: toPolygon(request.body.coords),
          center: turf.center(toPolygon(request.body.coords)).geometry
            .coordinates,
          coordTypes: Object.values(CoordinateType),
        });
      },
      query("coordType").isString().optional(),
      body("coords"),
      useCoordinateInput("coords", false)
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
        await controllers.buildTeam.getBuildTeams(request, response);
      },
      query("page").isNumeric().optional()
    );
    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id",
      async (request, response) => {
        await controllers.buildTeam.getBuildTeam(request, response);
      },
      param("id")
    );
    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id/application/questions",
      async (request: Request, response: Response) => {
        await controllers.buildTeam.getBuildTeamApplicationQuestions(
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
        await controllers.buildTeam.updateBuildTeamApplicationQuestions(
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
        await controllers.buildTeam.getBuildTeamSocials(request, response);
      },
      param("id")
    );
    router.addRoute(
      RequestMethods.POST,
      "/buildteams/:id/socials",
      async (request: Request, response: Response) => {
        await controllers.buildTeam.updateBuildTeamSocials(request, response);
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
        await controllers.buildTeam.deleteBuildTeamSocial(request, response);
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
        await controllers.buildTeam.getBuildTeamMembers(request, response);
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
        await controllers.buildTeam.removeBuildTeamMember(request, response);
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
        await controllers.buildTeam.getBuildTeamManagers(request, response);
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
        await controllers.buildTeam.updateBuildTeam(request, response);
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
        await controllers.buildTeam.generateBuildTeamToken(request, response);
      },
      param("id"),
      query("slug").optional()
      // Permission check later: Creator
    );
    router.addRoute(
      RequestMethods.DELETE,
      "/buildteams/:team/claims/:id",
      async (request, response) => {
        await controllers.claim.deleteClaim(request, response);
      },
      param("id").isUUID(),
      param("team"),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "team.claim.list",
        "team"
      )
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
        await controllers.claim.getClaims(request, response);
      }
    );
    router.addRoute(
      RequestMethods.GET,
      "/claims/geojson",
      async (request, response) => {
        await controllers.claim.getClaimsGeoJson(request, response);
      }
    );
    router.addRoute(
      RequestMethods.GET,
      "/map/statistics",
      async (request, response) => {
        await controllers.claim.getStatistics(request, response);
      }
    );
    router.addRoute(
      RequestMethods.GET,
      "/claims/:id",
      async (request, response) => {
        await controllers.claim.getClaim(request, response);
      },
      param("id").isUUID()
    );
    router.addRoute(
      RequestMethods.POST,
      "/claims",
      async (request, response) => {
        await controllers.claim.createClaim(request, response);
      },
      body("team").isString(),
      body("area").isArray().optional(),
      body("name").isString().optional(),
      body("description").isString().optional(),
      body("finished").isBoolean().optional(),
      body("active").isBoolean().optional(),
      body("builders").isArray().optional(),
      useCoordinateInput("area", false)
    );
    router.addRoute(
      RequestMethods.POST,
      "/claims/:id",
      async (request, response) => {
        await controllers.claim.updateClaim(request, response);
      },
      param("id").isUUID(),
      body("name").isString().optional(),
      body("description").optional(),
      body("finished").isBoolean().optional(),
      body("active").isBoolean().optional(),
      body("area").isArray().optional(),
      useCoordinateInput("area", false)
    );
    router.addRoute(
      RequestMethods.DELETE,
      "/claims/:id",
      async (request, response) => {
        await controllers.claim.deleteClaim(request, response);
      },
      param("id").isUUID()
    );
    router.addRoute(
      RequestMethods.DELETE,
      "/claims/:id/images/:image",
      async (request, response) => {
        await controllers.claim.deleteClaimImage(request, response);
      },
      param("image").isUUID(),
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
        await controllers.showcase.getShowcases(request, response);
      },
      param("id")
    );
    router.addRoute(
      RequestMethods.GET,
      "/showcases",
      async (request, response) => {
        await controllers.showcase.getAllShowcases(request, response);
      }
    );
    router.addRoute(
      RequestMethods.GET,
      "/showcases/random",
      async (request, response) => {
        await controllers.showcase.getRandomShowcases(request, response);
      },
      query("limit").isNumeric()
    );
    router.addRoute(
      RequestMethods.POST,
      "/buildteams/:id/showcases/link",
      async (request, response) => {
        await controllers.showcase.linkShowcase(request, response);
      },
      param("id"),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "team.showcases.edit",
        "id"
      )
    );
    router.addRoute(
      RequestMethods.POST,
      "/buildteams/:id/showcases",
      async (request, response) => {
        await controllers.showcase.createShowcase(request, response);
      },
      param("id"),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "team.showcases.edit",
        "id"
      ),
      this.web.getFileUpload().single("image")
    );
    router.addRoute(
      RequestMethods.DELETE,
      "/buildteams/:team/showcases/:id",
      async (request, response) => {
        await controllers.showcase.deleteShowcase(request, response);
      },
      param("team"),
      param("id").isUUID(),
      checkUserPermission(
        this.web.getCore().getPrisma(),
        "team.showcases.edit",
        "team"
      )
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
        await controllers.application.getApplications(request, response);
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
        await controllers.application.getUserApplications(request, response);
      },
      param("id"),
      param("user").isUUID()
    );
    router.addRoute(
      RequestMethods.GET,
      "/buildteams/:id/applications/:app",
      async (request, response) => {
        await controllers.application.getApplication(request, response);
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
        await controllers.application.review(request, response);
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
        await controllers.application.apply(request, response);
      },
      query("trial").isBoolean().optional()
    );
    router.addRoute(
      RequestMethods.GET,
      "/applications/:id",
      async (request, response) => {
        await controllers.application.getApplication(request, response);
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
        await controllers.application.review(request, response);
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
        await controllers.faq.getFaqQuestions(request, response);
      },
      query("page").isNumeric().optional()
    );
    router.addRoute(
      RequestMethods.POST,
      "/faq",
      async (request, response) => {
        await controllers.faq.addFaqQuestion(request, response);
      },
      body("question"),
      body("answer"),
      checkUserPermission(this.web.getCore().getPrisma(), "faq.add")
    );
    router.addRoute(
      RequestMethods.GET,
      "/faq/:id",
      async (request, response) => {
        await controllers.faq.getFaqQuestion(request, response);
      }
    );
    router.addRoute(
      RequestMethods.POST,
      "/faq/:id",
      async (request, response) => {
        await controllers.faq.editFaqQuestion(request, response);
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
        await controllers.faq.deleteFaqQuestions(request, response);
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
      "/builders/search",
      async (request, response) => {
        await controllers.user.searchBuilders(request, response);
      },
      query("search").isString().optional(),
      query("take").isNumeric().optional(),
      query("exact").isBoolean().optional()
    );
    router.addRoute(
      RequestMethods.GET,
      "/users",
      async (request, response) => {
        await controllers.user.getUsers(request, response);
      },
      query("page").isNumeric().optional(),
      checkUserPermission(this.web.getCore().getPrisma(), "users.list")
    );
    router.addRoute(
      RequestMethods.GET,
      "/users/:id",
      async (request, response) => {
        await controllers.user.getUser(request, response);
      },
      param("id").isUUID()
      // Permission check later
    );
    router.addRoute(
      RequestMethods.GET,
      "/users/:id/kc",
      async (request, response) => {
        await controllers.user.getKeycloakUser(request, response);
      },
      param("id").isUUID()
      // Permission check later
    );
    router.addRoute(
      RequestMethods.GET,
      "/users/:id/review",
      async (request, response) => {
        await controllers.user.getUserReviews(request, response);
      },
      param("id").isUUID()
      // Permission check later
    );
    router.addRoute(
      RequestMethods.POST,
      "/users/:id",
      async (request, response) => {
        await controllers.user.updateUser(request, response);
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
        await controllers.user.getPermissions(request, response);
      },
      param("id"),
      checkUserPermission(this.web.getCore().getPrisma(), "users.list")
    );
    router.addRoute(
      RequestMethods.POST,
      "/users/:id/permissions",
      async (request, response) => {
        await controllers.user.addPermission(request, response);
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
        await controllers.user.removePermission(request, response);
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
        await controllers.contact.getContacts(request, response);
      }
    );
    router.addRoute(
      RequestMethods.POST,
      "/contacts",
      async (request, response) => {
        await controllers.faq.addFaqQuestion(request, response);
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
        await controllers.faq.editFaqQuestion(request, response);
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
        await controllers.newsletter.getNewsletters(request, response);
      },
      param("page").optional()
    );
    router.addRoute(
      RequestMethods.GET,
      "/newsletter/:id",
      async (request, response) => {
        await controllers.newsletter.getNewsletter(request, response);
      },
      param("id"),
      query("isIssue").optional()
    );
    router.addRoute(
      RequestMethods.POST,
      "/newsletter",
      async (request, response) => {
        await controllers.newsletter.addNewsletter(request, response);
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
        await controllers.tokenRoute.getClaims(request, response);
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
        await controllers.tokenRoute.getClaim(request, response);
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
        await controllers.tokenRoute.addClaims(request, response);
      },
      // body("data").isArray({ min: 1, max: 100 }),
      param("team"),
      checkTokenValidity(this.web.getCore().getPrisma(), "team")
    );
    router.addRoute(
      RequestMethods.POST,
      "/public/buildteams/:team/claims/:id",
      async (request, response) => {
        await controllers.tokenRoute.updateClaim(request, response);
      },
      param("team"),
      param("id"),
      body("owner").isUUID().optional(),
      body("area").optional(),
      body("active").isBoolean().optional(),
      body("finished").isBoolean().optional(),
      body("name").isString().optional(),
      useCoordinateInput("area", false),
      checkTokenValidity(this.web.getCore().getPrisma(), "team")
    );
    router.addRoute(
      RequestMethods.POST,
      "/public/buildteams/:team/claims",
      async (request, response) => {
        await controllers.tokenRoute.addClaim(request, response);
      },
      param("team"),
      body("owner").isString(),
      body("builders").isArray({ max: 20 }).optional(),
      body("area"),
      body("active").isBoolean(),
      body("finished").isBoolean(),
      body("name").isString(),
      body("id").isUUID().optional(),
      useCoordinateInput("area", true),
      checkTokenValidity(this.web.getCore().getPrisma(), "team")
    );
    router.addRoute(
      RequestMethods.DELETE,
      "/public/buildteams/:team/claims/:id",
      async (request, response) => {
        await controllers.tokenRoute.removeClaim(request, response);
      },
      param("team"),
      checkTokenValidity(this.web.getCore().getPrisma(), "team")
    );
    router.addRoute(
      RequestMethods.GET,
      "/public/buildteams/:id/members",
      async (request, response) => {
        await controllers.buildTeam.getBuildTeamMembers(request, response);
      },
      param("id"),
      query("page").isNumeric().optional(),
      checkTokenValidity(this.web.getCore().getPrisma(), "id")
    );

    /*
     *
     * Admin Routes
     *
     */
    router.addRoute(
      RequestMethods.GET,
      "/admin/cron",
      async (request, response) => {
        await controllers.admin.getCronJobs(request, response);
      },
      checkUserPermission(this.web.getCore().getPrisma(), "admin.admin")
    );
    router.addRoute(
      RequestMethods.GET,
      "/admin/progress",
      async (request, response) => {
        await controllers.admin.getProgress(request, response);
      },
      checkUserPermission(this.web.getCore().getPrisma(), "admin.admin")
    );
    router.addRoute(
      RequestMethods.POST,
      "/admin/claims/buildings",
      async (request, response) => {
        await controllers.admin.getClaimBuildingCounts(request, response);
      },
      query("skipExisting").isBoolean().optional(),
      query("take").isNumeric().optional(),
      query("skip").isNumeric().optional(),
      query("gte").isNumeric().optional(),
      checkUserPermission(this.web.getCore().getPrisma(), "admin.admin")
    );
    router.addRoute(
      RequestMethods.POST,
      "/admin/claims/addresses",
      async (request, response) => {
        await controllers.admin.getClaimOSMDetails(request, response);
      },
      query("skipExisting").isBoolean().optional(),
      query("take").isNumeric().optional(),
      query("skip").isNumeric().optional(),
      checkUserPermission(this.web.getCore().getPrisma(), "admin.admin")
    );
    router.addRoute(
      RequestMethods.POST,
      "/admin/claims/sizes",
      async (request, response) => {
        await controllers.admin.getClaimSizes(request, response);
      },
      query("take").isNumeric().optional(),
      query("skip").isNumeric().optional(),
      checkUserPermission(this.web.getCore().getPrisma(), "admin.admin")
    );
    router.addRoute(
      RequestMethods.POST,
      "/admin/images",
      async (request, response) => {
        await controllers.admin.getImageHashes(request, response);
      },
      checkUserPermission(this.web.getCore().getPrisma(), "admin.admin")
    );
  }
}

export default Routes;
