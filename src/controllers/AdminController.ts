import { Request, Response } from "express";

import axios from "axios";
import Core from "../Core.js";
import { toOverpassPolygon } from "../util/Coordinates.js";
import { ERROR_GENERIC } from "../util/Errors.js";

class AdminController {
  private core: Core;
  private progress;

  constructor(core: Core) {
    this.core = core;
    this.progress = {
      buildings: { done: 0, total: 0 },
      adresses: { done: 0, total: 0 },
    };
  }

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

  public getProgress(req: Request, res: Response) {
    res.send(this.progress);
  }

  public async getClaimBuildingCounts(req: Request, res: Response) {
    if (this.progress.buildings > 0) {
      return ERROR_GENERIC(res, 409, "Recalculations are already ongoing.");
    }

    const claims = await this.core.getPrisma().claim.findMany({
      where: {
        center: { not: null },
        buildings:
          req.query.skipExisting === "true"
            ? 0
            : {
                gte: req.query.take ? parseInt(req.query.gte as string) : 0,
              },
      },
      take: req.query.take && parseInt(req.query.take as string),
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
      select: { buildings: true, id: true, area: true },
    });

    res.send({ progress: 0, count: claims.length });
    this.progress.buildings.total = claims.length;

    for (const [i, claim] of claims.entries()) {
      const polygon = toOverpassPolygon(claim.area);

      const overpassQuery = `[out:json][timeout:25];
        (
          node["building"]["building"!~"grandstand"]["building"!~"roof"]["building"!~"garage"]["building"!~"hut"]["building"!~"shed"](poly: "${polygon}");
          way["building"]["building"!~"grandstand"]["building"!~"roof"]["building"!~"garage"]["building"!~"hut"]["building"!~"shed"](poly: "${polygon}");
          relation["building"]["building"!~"grandstand"]["building"!~"roof"]["building"!~"garage"]["building"!~"hut"]["building"!~"shed"](poly: "${polygon}");
        );
      out count;`;

      const { data } = await axios.get(
        `https://overpass.kumi.systems/api/interpreter?data=${overpassQuery.replace(
          "\n",
          ""
        )}`
      );
      this.core
        .getLogger()
        .debug(
          "Getting buildings for claim " +
            claim.id +
            ` (${i + 1}/${claims.length})`
        );

      const updatedClaim = await this.core.getPrisma().claim.update({
        where: { id: claim.id },
        data: { buildings: parseInt(data?.elements[0]?.tags?.total) || 0 },
      });

      this.progress.buildings.done = i + 1;
    }
    this.progress.buildings = { done: 0, total: 0 };
  }
}

export default AdminController;
