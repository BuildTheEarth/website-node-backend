import * as bodyParser from 'body-parser';
import Web from '../Web';
import Router from './utils/Router';
import { RequestMethods } from './utils/RequestMethods';
import User from '../../db/models/User';
import AuthController from '../../util/auth/AuthController';
import Middlewares from '../Middlewares';

class Routes {
    app;

    web: Web;

    middlewares: Middlewares

    constructor(web: Web, middlewares: Middlewares) {
      this.middlewares = middlewares;
      web.getCore().getLogger().info('Registering API routes');
      this.web = web;
      this.app = web.getApp();
      this.registerRoutes();
    }

    private registerRoutes() {
      const router: Router = new Router(this.web);

      router.addRoute(RequestMethods.GET, '/', (request, response) => {
        const user = new User({ name: 'Bob' });
        user.save().then(() => response.send('Test'));
      });

      /*
            Authentication
         */

      const authController: AuthController = new AuthController(this.web.getCore());

      router.addRoute(RequestMethods.GET, '/authorize', authController.authorizeHandler);
      router.addRoute(RequestMethods.POST, '/api/token', authController.getTokenHandler);
      router.addRoute(RequestMethods.GET, '/test', (req, res) => {
        res.send('test123');
      }, this.middlewares.requireAuth);
    }
}

export default Routes;
