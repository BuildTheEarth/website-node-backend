import { Request, Response } from "express";

import { validationResult } from "express-validator";
import Core from "../Core.js";
import { ERROR_VALIDATION } from "../util/Errors.js";
import { rerenderFrontend } from "../util/Frontend.js";

class ContactController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getContacts(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const contacts = await this.core.getPrisma().contact.findMany({});
    res.send(contacts);
  }

  public async addContact(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }
    const { name, role, discord, email, avatar } = req.body;
    const contact = await this.core.getPrisma().contact.create({
      data: { name, role, discord, email, avatar },
    });

    rerenderFrontend("/contact", {});
    res.send(contact);
  }

  public async editContact(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const { name, role, discord, email, avatar } = req.body;
    const contact = await this.core.getPrisma().contact.update({
      where: { id: req.params.id },
      data: { name, role, discord, email, avatar },
    });

    rerenderFrontend("/contact", {});
    res.send(contact);
  }
}

export default ContactController;
