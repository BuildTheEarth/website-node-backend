import {Executor} from "./Executor";
import {RequestMethods} from "./RequestMethods";
import Web from "../../Web";
import { Request, Response } from 'express';


export class Router {
    web: Web;
    constructor(web: Web) {
        this.web = web;
    }


    public addRoute(requestMethod: RequestMethods, endpoint: String, executor: Executor) {
        this.web.getCore().getLogger().debug(`Registering endpoint "${endpoint}"`)
        switch (requestMethod) {
            case RequestMethods.GET:
                this.web.getApp().get(endpoint, (rq: Request, rs: Response) => executor(rq, rs));
                break;
            case RequestMethods.POST:
                this.web.getApp().post(endpoint, (rq: Request, rs: Response) => executor(rq, rs));
        }
    }

}
