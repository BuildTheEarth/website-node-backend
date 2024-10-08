import { Request, Response } from "express";

import { ERROR_GENERIC } from "../../../util/Errors.js";
import Web from "../../Web.js";
import { Executor } from "./Executor.js";
import { RequestMethods } from "./RequestMethods.js";

export default class Router {
  web: Web;
  version: String;

  constructor(web: Web, version: String) {
    this.web = web;
    this.version = version;
  }

  public addRoute(
    requestMethod: RequestMethods,
    endpoint: String,
    executor: Executor,
    ...middlewares: any
  ) {
    this.web
      .getCore()
      .getLogger()
      .debug(
        `Registering endpoint "${requestMethod.toString()} api/${
          this.version
        }${endpoint}"`
      );
    this.web
      .getApp()
      .all(
        `/api/${this.version}${endpoint}`,
        middlewares,
        (rq: Request, rs: Response, next: any) => {
          if (rq.method === requestMethod.valueOf()) {
            try {
              executor(rq, rs);
            } catch (e) {
              ERROR_GENERIC(
                rq,
                rs,
                500,
                "Internal Server Error. Please try again and report this bug."
              );
            }

            return;
          }
          next();
        }
      );
  }
}
