import { Request, Response } from "express";
import { FrontendRoutesGroups, rerenderFrontend } from "../util/Frontend.js";

import { validationResult } from "express-validator";
import Core from "../Core.js";
import { ERROR_VALIDATION } from "../util/Errors.js";

class CalendarController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getCalendarEvents(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      const events = await this.core.getPrisma().calendarEvent.findMany({
        skip: page * 10,
        take: 10,
        include: {
          buildTeam: {
            select: { slug: true, name: true, location: true, icon: true },
          },
        },
      });
      let count = await this.core.getPrisma().calendarEvent.count();
      res.send({ pages: Math.ceil(count / 10), data: events });
    } else {
      const events = await this.core.getPrisma().calendarEvent.findMany({
        include: {
          buildTeam: {
            select: { slug: true, name: true, location: true, icon: true },
          },
        },
      });
      res.send(events);
    }
  }

  public async getCalendarEvent(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    const event = await this.core
      .getPrisma()
      .calendarEvent.findFirst({ where: { id: req.params.id } });
    res.send(event);
  }

  public async addCalendarEvent(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    const event = await this.core.getPrisma().calendarEvent.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        start: new Date(req.body.start),
        end: new Date(req.body.end),
        city: req.body.city,
        country: req.body.country,
        discordLink: req.body.discordLink,
        buildTeam: {
          connect: req.query.slug
            ? { slug: req.body.buildTeam }
            : { id: req.body.buildTeam },
        },
      },
    });

    res.send(event);
  }

  // public async editFaqQuestion(req: Request, res: Response) {
  //   const errors = validationResult(req);
  //   if (!errors.isEmpty()) {
  //     return ERROR_VALIDATION(res, errors.array());
  //   }

  //   const question = await this.core.getPrisma().fAQQuestion.update({
  //     where: { id: req.params.id },
  //     data: {
  //       links: req.body.links,
  //       question: req.body.question,
  //       answer: req.body.answer,
  //     },
  //   });

  //   rerenderFrontend(FrontendRoutesGroups.FAQ, {});
  //   res.send(question);
  // }

  // public async deleteFaqQuestions(req: Request, res: Response) {
  //   const errors = validationResult(req);
  //   if (!errors.isEmpty()) {
  //     return ERROR_VALIDATION(res, errors.array());
  //   }
  //   const question = await this.core.getPrisma().fAQQuestion.delete({
  //     where: { id: req.params.id },
  //   });

  //   rerenderFrontend(FrontendRoutesGroups.FAQ, {});
  //   res.send(question);
  // }
}

export default CalendarController;
