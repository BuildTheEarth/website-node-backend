import { Request, Response } from 'express';
import { Executor } from './Executor.js';
import { RequestMethods } from './RequestMethods.js';
import Web from '../../Web.js';

export default class Router {
    web: Web;
    version: String;

    constructor(web: Web, version: String) {
      this.web = web;
      this.version = version;
    }

    public addRoute(requestMethod: RequestMethods, endpoint: String,
                    executor: Executor, ...middlewares: any) {
        this.web.getCore().getLogger().debug(`Registering endpoint "${requestMethod.toString()} api/${this.version}${endpoint}"`);
        this.web.getApp().all(`/api/${this.version}${endpoint}`, middlewares, (rq: Request, rs: Response, next: any) => {
            if (rq.method === requestMethod.valueOf()) {
                executor(rq, rs);
                return;
            }
            next();
        });
    }
}
