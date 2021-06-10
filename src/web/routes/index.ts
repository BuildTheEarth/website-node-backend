import Web from "../Web";
import {Router} from "./utils/Router";
import {RequestMethods} from "./utils/RequestMethods";
import User from "../../db/models/User";
import AuthController from "../../util/auth/AuthController";

class Routes {
    app;
    web: Web;

    constructor(web: Web) {
        web.getCore().getLogger().info('Registering API routes');
        this.web = web;
        this.app = web.getApp();
        this.registerRoutes();
    }

    private registerRoutes() {

        let router: Router = new Router(this.web)

        router.addRoute(RequestMethods.GET, '/', (request, response) => {
            const user = new User({name: "Bob"});
            user.save().then(() => response.send('Test'));
        })

        /*
            Authentication
         */

        let authController: AuthController = new AuthController(this.web.getCore())

        router.addRoute(RequestMethods.GET, '/authorize', authController.authorizeHandler)


    }
}

export default Routes;
