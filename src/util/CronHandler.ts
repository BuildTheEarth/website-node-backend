import { CronJob } from "cron";
import { CronJobParams } from "cron/dist/types/cron.types.js";
import Core from "../Core.js";

class CronHandler {
  private core: Core;
  private jobs;

  constructor(core: Core) {
    this.core = core;
    this.jobs = {};
  }

  public addMany(jobs: { params: CronJobParams; id: string }[]) {
    jobs.forEach((job) => this.add(job.id, job.params));
  }

  public add(id: string, job: CronJobParams) {
    this.jobs[id] = CronJob.from(job);
  }

  public stop(id: string) {
    this.jobs[id].stop();
  }

  public start(id: string) {
    this.jobs[id].start();
  }

  public get(id: string) {
    return this.jobs[id];
  }

  public getAll() {
    return this.jobs;
  }
}

export default CronHandler;
