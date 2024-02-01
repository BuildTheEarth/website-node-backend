import { Request, Response } from "express";

import Core from "../Core.js";
import { ERROR_GENERIC } from "../util/Errors.js";

class AdminController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  // CRON
  public getCronJobs(req: Request, res: Response) {
    const jobs = this.core.getCron().getAll();

    res.send(
      Object.keys(jobs).map((j) => {
        const job = jobs[j];
        return {
          id: j,
          lastExecution: job.lastExecution?.toISOString(),
          nextExecution: job.nextDate().toISO(),
          running: job.running,
          cronTime: job.cronTime.source,
        };
      })
    );
  }
}

export default AdminController;
