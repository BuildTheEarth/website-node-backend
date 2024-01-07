import { Response } from "express";

export const ERROR_NO_PERMISSION = (res: Response, msg?: string) => {
  return res.status(401).send({
    error: true,
    errors: [],
    message: msg || "You don't have permission to access this resource",
    code: 401,
  });
};

export const ERROR_VALIDATION = (
  res: Response,
  errors: any[],
  msg?: string
) => {
  return res.status(400).send({
    error: true,
    errors: errors,
    message: msg || "Validation error",
    code: 400,
  });
};

export const ERROR_GENERIC = (
  res: Response,
  code: number,
  msg: string,
  errors?: any[]
) => {
  return res.status(code).send({
    error: true,
    errors: errors,
    message: msg,
    code: code,
  });
};
