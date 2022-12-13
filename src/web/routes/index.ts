import Web from '../Web.js';
import Router from './utils/Router.js';
import {RequestMethods} from './utils/RequestMethods.js';
import {Keycloak} from "keycloak-connect";
import BuildTeamController from "../../controllers/BuildTeamController.js";
import {query} from "express-validator";

class Routes {
    app;

    web: Web;

    keycloak: Keycloak;

    constructor(web: Web) {
        web.getCore().getLogger().info('Registering API routes');
        this.web = web;
        this.app = web.getApp();
        this.keycloak = this.web.getKeycloak();
        this.registerRoutes();

    }

    private registerRoutes() {
        const legacyRouter: Router = new Router(this.web, "");
        const router: Router = new Router(this.web, "v1");

        const buildTeamController = new BuildTeamController(this.web.getCore());

        legacyRouter.addRoute(RequestMethods.GET, "modpack/images", (request, response) => {
            response.send({"1":{"url":"https://i.imgur.com/N5cplwx.jpeg","credit":"waggiswagen#2266, Knäggi#4895 render: jo_kil#1977"},"2":{"url":"https://i.imgur.com/tGtWJGk.jpeg","credit":"Woesh3#1155"},"3":{"url":"https://i.imgur.com/yxEWCdQ.jpeg","credit":"Juancy23#9223"},"4":{"url":"https://i.imgur.com/yQjMRlr.jpeg","credit":"Leander#2813, Grischbrei#6173, Norwod#9035 & DasBirnenDing#1574"},"5":{"url":"https://i.imgur.com/9zqFHxa.png","credit":"Schnieven#0083, XilefHD#7198, copac#6194, render: XilefHD#7198"},"logo":{"url":"https://i.imgur.com/ih6BF72.png","credit":null}})
        });

        router.addRoute(RequestMethods.GET, '/healthcheck', (request, response) => {
            response.send({status: "up"});
        });


        router.addRoute(RequestMethods.GET, '/buildteams', async (request, response) => {
            await buildTeamController.getBuildTeams(request, response);
        }, query('page').isNumeric().optional());

    }
}

export default Routes;
