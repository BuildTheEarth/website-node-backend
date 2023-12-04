import { FrontendRoutesGroups, rerenderFrontend } from "../util/Frontend.js";
import { Request, Response } from "express";

import Core from "../Core.js";
import { validationResult } from "express-validator";

class NewsletterController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getNewsletters(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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
      return res.status(400).json({ errors: errors.array() });
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
      res.status(404).send({
        code: 404,
        message: "Newsletter does not exist.",
        translationKey: "404",
      });
    }
    return;
  }

  public async addNewsletter(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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
