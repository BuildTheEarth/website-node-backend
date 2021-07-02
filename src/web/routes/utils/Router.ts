import { Request, Response } from 'express';
import { Executor } from './Executor';
import { RequestMethods } from './RequestMethods';
import Web from '../../Web';

export default class Router {
    web: Web;

    constructor(web: Web) {
      this.web = web;
    }

    public addRoute(requestMethod: RequestMethods, endpoint: String,
      executor: Executor, ...middlewares: any) {
      this.web.getCore().getLogger().debug(`Registering endpoint "${endpoint}"`);
      this.web.getApp().all(endpoint, middlewares, (rq: Request, rs: Response, next: any) => {
        if (rq.method === requestMethod.valueOf()) {
          executor(rq, rs);
          return;
        }
        next();
      });
    }
}
