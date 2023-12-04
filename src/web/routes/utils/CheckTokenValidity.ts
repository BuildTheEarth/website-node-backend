import { NextFunction, Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";

import { minimatch } from "minimatch";

export const checkTokenValidity = (prisma: PrismaClient, buildteam: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.params[buildteam]) {
      res.status(401).send("No token provided");
      return;
    }
    const tokenTeam = await prisma.buildTeam.findFirst({
      where: { id: req.params[buildteam] },
    });

    if (!tokenTeam) {
      res.status(401).send("Invalid token");
      return;
    }

    const authHeader = req.headers.key;

    if (!authHeader) {
      res
        .status(401)
        .send(
          "Invalid authorization header, please use api keys for private routes."
        );
      return;
    }

    if (tokenTeam.token !== authHeader) {
      res.status(401).send("You don't have permission to do this!");
      return;
    }

    next();
  };
};
