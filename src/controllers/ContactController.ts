import { Request, Response } from "express";

import Core from "../Core.js";
import { questions } from "../util/QuestionData.js";
import { validationResult } from "express-validator";
import yup from "yup";

class ContactController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getContacts(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const contacts = await this.core.getPrisma().contact.findMany({});
    res.send(contacts);
  }
}

export default ContactController;
