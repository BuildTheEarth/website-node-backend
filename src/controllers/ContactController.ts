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

  public async addContact(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, role, discord, email, avatar } = req.body;
    const contact = await this.core.getPrisma().contact.create({
      data: { name, role, discord, email, avatar },
    });
    res.send(contact);
  }

  public async editContact(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, role, discord, email, avatar } = req.body;
    const contact = await this.core.getPrisma().contact.update({
      where: { id: req.params.id },
      data: { name, role, discord, email, avatar },
    });
    res.send(contact);
  }
}

export default ContactController;
