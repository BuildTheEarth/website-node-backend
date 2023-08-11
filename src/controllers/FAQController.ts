import {Request, Response} from "express";

import Core from "../Core.js";
import {validationResult} from "express-validator";

class FaqController {
    private core: Core;

    constructor(core: Core) {
        this.core = core;
    }

    public async getFaqQuestions(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }
        if (req.query && req.query.page) {
            let page = parseInt(req.query.page as string);
            const questions = await this.core.getPrisma().fAQQuestion.findMany({
                skip: page * 10,
                take: 10,
            });
            let count = await this.core.getPrisma().fAQQuestion.count();
            res.send({pages: Math.ceil(count / 10), data: questions});
        } else {
            const questions = await this.core.getPrisma().fAQQuestion.findMany({});
            res.send(questions);
        }
    }

    public async addFaqQuestion(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }
        const question = await this.core.getPrisma().fAQQuestion.create({
            data: {question: req.body.question, answer: req.body.answer},
        });
        res.send(question);
    }

    public async editFaqQuestion(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const question = await this.core.getPrisma().fAQQuestion.update({
            where: {id: req.params.id},
            data: {
                links: req.body.links,
                question: req.body.question,
                answer: req.body.answer,
            },
        });
        res.send(question);
    }
}

export default FaqController;
