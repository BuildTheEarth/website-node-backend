import { CronJob } from "cron";
import { CronJobParams } from "cron/dist/types/cron.types.js";
import Core from "../Core.js";

class CronHandler {
  private core: Core;
  private jobs: { [id: string]: CronJob };

  constructor(core: Core, jobs?: { params: CronJobParams; id: string }[]) {
    this.core = core;
    this.jobs = {};
    if (jobs) this.addMany(jobs);
    this.printList();
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

  public nextRun(id: string) {
    return this.jobs[id].nextDate();
  }

  public printList() {
    this.core.getLogger().info("---------------------------------");
    this.core.getLogger().info("Next Cron Job Runs:");
    this.core.getLogger().info("");
    Object.keys(this.jobs).forEach((id) => {
      const job = this.jobs[id];
      this.core
        .getLogger()
        .info(
          `${id} - ${job.nextDate().toRelative({ locale: "en" })} (${job
            .nextDate()
            .toISOTime()})`
        );
    });
    this.core.getLogger().info("---------------------------------");
  }
}

export default CronHandler;
