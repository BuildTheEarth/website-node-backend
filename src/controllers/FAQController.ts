import { Request, Response } from "express";
import { FrontendRoutesGroups, rerenderFrontend } from "../util/Frontend.js";

import { validationResult } from "express-validator";
import Core from "../Core.js";
import { ERROR_VALIDATION } from "../util/Errors.js";

class FaqController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getFaqQuestions(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      const questions = await this.core.getPrisma().fAQQuestion.findMany({
        skip: page * 10,
        take: 10,
      });
      let count = await this.core.getPrisma().fAQQuestion.count();
      res.send({ pages: Math.ceil(count / 10), data: questions });
    } else {
      const questions = await this.core.getPrisma().fAQQuestion.findMany({});
      res.send(questions);
    }
  }

  public async addFaqQuestion(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }
    const question = await this.core.getPrisma().fAQQuestion.create({
      data: { question: req.body.question, answer: req.body.answer },
    });

    rerenderFrontend(FrontendRoutesGroups.FAQ, {});
    res.send(question);
  }

  public async editFaqQuestion(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const question = await this.core.getPrisma().fAQQuestion.update({
      where: { id: req.params.id },
      data: {
        links: req.body.links,
        question: req.body.question,
        answer: req.body.answer,
      },
    });

    rerenderFrontend(FrontendRoutesGroups.FAQ, {});
    res.send(question);
  }

  public async deleteFaqQuestions(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }
    const question = await this.core.getPrisma().fAQQuestion.delete({
      where: { id: req.params.id },
    });

    rerenderFrontend(FrontendRoutesGroups.FAQ, {});
    res.send(question);
  }
}

export default FaqController;
