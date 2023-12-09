import { Prisma, PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { minimatch } from "minimatch";

export const checkTokenValidity = (prisma: PrismaClient, buildteam: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.params[buildteam]) {
      res.status(401).send("No token provided");
      return;
    }
    const tokenTeam = await prisma.buildTeam.findFirst({
      where: req.query.slug
        ? { slug: req.params[buildteam] }
        : { id: req.params[buildteam] },
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
          "Invalid authorization header, please use api keys for public routes."
        );
      return;
    }

    if (tokenTeam.token !== authHeader) {
      res.status(401).send("You don't have permission to do this!");
      return;
    }

    req.team = tokenTeam;
    next();
  };
};
