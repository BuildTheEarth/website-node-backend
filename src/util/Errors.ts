import { Request, Response } from "express";

import { validationResult } from "express-validator";
import { LIB_VERSION } from "./package.js";

export const ERROR_NO_PERMISSION = (
  req: Request,
  res: Response,
  msg?: string,
) => {
  return ERROR_GENERIC(
    req,
    res,
    401,
    msg || "You don't have permission to access this resource.",
  );
};

export const ERROR_VALIDATION = (
  req: Request,
  res: Response,
  errors: any[],
  msg?: string,
) => {
  return ERROR_GENERIC(req, res, 400, msg || "Validation error.", errors);
};

export const ERROR_GENERIC = (
  req: Request,
  res: Response,
  code: number,
  msg: string,
  errors?: any[],
) => {
  return res.status(code).send({
    error: true,
    errors: errors || [],
    message: msg,
    code: code,
    timestamp: new Date().toISOString(),
    url: req.path,
    authorization: req.headers.authorization?.split(" ")[0],
    version: LIB_VERSION,
  });
};
