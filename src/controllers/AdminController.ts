import { Request, Response } from "express";

import Core from "../Core.js";

class AdminController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  // CRON
  public getCronJobs(req: Request, res: Response) {
    const jobs = this.core.ge;
  }
}

export default AdminController;
