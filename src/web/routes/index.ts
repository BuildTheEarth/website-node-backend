import Web from "../Web";
import {Router} from "./utils/Router";
import {RequestMethods} from "./utils/RequestMethods";
import User from "../../db/models/User";

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
        new Router(this.web)
            .addRoute(RequestMethods.GET, '/', (request, response) => {
                const user = new User({name: "Bob"});
                user.save().then(() => response.send('Test'));
            })
    }
}

export default Routes;
