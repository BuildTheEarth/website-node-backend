import Web from '../Web';
import Router from './utils/Router';
import {RequestMethods} from './utils/RequestMethods';
import {Keycloak} from "keycloak-connect";
import checkNewUser from "./utils/CheckNewUserMiddleware";
import BuildTeamController from "../../controllers/BuildTeamController";

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
        const router: Router = new Router(this.web);

        const buildTeamController = new BuildTeamController(this.web.getCore());

        router.addRoute(RequestMethods.GET, '/ping', (request, response) => {
            response.send('Pong!');
        }, this.keycloak.protect(), checkNewUser(this.web.getCore().getPrisma(), this.web.getCore()));

        router.addRoute(RequestMethods.GET, '/buildteams', async (request, response) => {
            await buildTeamController.getBuildTeams(request, response);
        });

        /*router.addRoute(RequestMethods.GET, '/test', async (request, response) => {
            const user = await this.web.getCore().getPrisma().user.findUnique({
                where: {
                    ssoId: "be29efbf-6ba7-43d6-846a-f92fc8b1c8b8"
                }
            })
            const buildteam = await this.web.getCore().getPrisma().buildTeam.create({
                data: {
                    creatorId: user.id,
                    name: "BTE Kiosk"
                }
            })
            response.send(buildteam)
        });*/

        router.addRoute(RequestMethods.GET, '/test2', async (request, response) => {
            const buildteam = await this.web.getCore().getPrisma().buildTeam.findUnique({
                where: {
                    id: "1f1dfe8e-a999-4f90-a59a-298b3d4e259a"
                },
                include: {
                    members: true
                }
            })
            response.send(buildteam)
        });
    }
}

export default Routes;
