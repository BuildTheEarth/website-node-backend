import { Request, Response } from "express";
import { ERROR_GENERIC, ERROR_VALIDATION } from "../util/Errors.js";
import { FrontendRoutesGroups, rerenderFrontend } from "../util/Frontend.js";

import { validationResult } from "express-validator";
import Core from "../Core.js";

class NewsletterController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getNewsletters(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      const newsletters = await this.core.getPrisma().newsletter.findMany({
        skip: page * 10,
        take: 10,
      });
      let count = await this.core.getPrisma().newsletter.count();
      res.send({ pages: Math.ceil(count / 10), data: newsletters });
    } else {
      const newsletters = await this.core.getPrisma().newsletter.findMany({});
      res.send(newsletters);
    }
  }

  public async getNewsletter(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    const newsletter = await this.core.getPrisma().newsletter.findUnique({
      where: req.query.isIssue
        ? {
            issue: parseInt(req.params.id as string),
          }
        : {
            id: req.params.id,
          },
    });
    if (newsletter) {
      res.send(newsletter);
    } else {
      ERROR_GENERIC(req, res, 404, "Newseltter does not exist.");
    }
    return;
  }

  public async addNewsletter(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    const issue = (await this.core.getPrisma().newsletter.count()) + 1;
    const newsletter = await this.core.getPrisma().newsletter.create({
      data: {
        issue: issue,
        title: req.body.title,
        published_date: new Date(),
        links: req.body.links,
        public: req.body.public ? req.body.public : true,
      },
    });

    rerenderFrontend(FrontendRoutesGroups.FAQ, {
      newsletter: newsletter.issue,
    });
    res.send(newsletter);
  }
}

export default NewsletterController;
