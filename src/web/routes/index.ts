import Web from '../Web';
import Router from './utils/Router';
import {RequestMethods} from './utils/RequestMethods';
import {Keycloak} from "keycloak-connect";
import checkNewUser from "./utils/CheckNewUserMiddleware";

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

        router.addRoute(RequestMethods.GET, '/ping', (request, response) => {
            response.send('Pong!');
        }, this.keycloak.protect(), checkNewUser(this.web.getCore().getPrisma(), this.web.getCore()));
    }
}

export default Routes;
