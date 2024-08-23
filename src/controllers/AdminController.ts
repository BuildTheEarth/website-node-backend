import { Request, Response } from "express";
import turf, { toPolygon } from "../util/Coordinates.js";
import {
  ERROR_GENERIC,
  ERROR_NO_PERMISSION,
  ERROR_VALIDATION,
} from "../util/Errors.js";

import { validationResult } from "express-validator";
import { getPlaiceholder } from "plaiceholder";
import Core from "../Core.js";
import { userHasPermissions } from "../web/routes/utils/CheckUserPermissionMiddleware.js";

class AdminController {
  private core: Core;
  private progress: {
    buildings: { done: number; total: number };
    addresses: { done: number; total: number };
    sizes: { done: number; total: number };
  };

  constructor(core: Core) {
    this.core = core;
    this.progress = {
      buildings: { done: 0, total: 0 },
      addresses: { done: 0, total: 0 },
      sizes: { done: 0, total: 0 },
    };
  }

  /**
   * Get currently registered Cron jobs and when they will run again
   */
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

  /**
   * Get current Admin progress of different recalculations
   */
  public getProgress(req: Request, res: Response) {
    res.send(this.progress);
  }

  /**
   * Recalculate the building counts of claims
   */
  public async getClaimBuildingCounts(req: Request, res: Response) {
    if (this.progress.buildings.done > 0) {
      return ERROR_GENERIC(
        req,
        res,
        409,
        "Recalculations are already ongoing."
      );
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
      this.core
        .getWeb()
        .getControllers()
        .claim.updateClaimBuildingCount(claim, true);
      this.progress.buildings.done = i + 1;
    }
    this.progress.buildings = { done: 0, total: 0 };
  }

  /**
   * Recalculate the OSM addresses of claims
   */
  public async getClaimOSMDetails(req: Request, res: Response) {
    if (this.progress.addresses.done > 0) {
      return ERROR_GENERIC(
        req,
        res,
        409,
        "Recalculations are already ongoing."
      );
    }

    let claims = await this.core.getPrisma().claim.findMany({
      where: {
        center: { not: null },
        osmName: req.query.skipExisting === "true" ? null : undefined,
      },
      take: req.query.take && parseInt(req.query.take as string),
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
      select: { center: true, id: true, osmName: true, city: true, name: true },
    });

    res.send({ progress: 0, count: claims.length });
    this.progress.addresses.total = claims.length;

    for (const [i, claim] of claims.entries()) {
      if (
        req.query?.skipOld === "true" &&
        claim.osmName !== "" &&
        claim.city != ""
      ) {
        continue;
      }

      await this.core
        .getWeb()
        .getControllers()
        .claim.updateClaimOSMDetails(claim, true);

      this.progress.addresses.done = i;
    }

    this.progress.addresses = { done: 0, total: 0 };
  }

  /**
   * Recalculate the sizes of claims
   */
  public async getClaimSizes(req: Request, res: Response) {
    if (this.progress.sizes.done > 0) {
      return ERROR_GENERIC(
        req,
        res,
        409,
        "Recalculations are already ongoing."
      );
    }

    const claims = await this.core.getPrisma().claim.findMany({
      where: {
        center: { not: null },
        size: 0,
      },
      take: req.query.take && parseInt(req.query.take as string),
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
      select: { buildings: true, id: true, area: true },
    });

    res.send({ progress: 0, count: claims.length });
    this.progress.sizes.total = claims.length;

    for (const [i, claim] of claims.entries()) {
      const area = claim.area;

      if (area.at(-1) != area.at(0)) {
        claim.area.push(area.at(0));
      }

      await this.core.getPrisma().claim.update({
        where: { id: claim.id },
        data: {
          size: turf.area(toPolygon(area)),
        },
      });

      this.progress.sizes.done = i + 1;
    }
    this.progress.sizes = { done: 0, total: 0 };
  }

  /**
   * Update the hases of all uploaded images
   */
  public async getImageHashes(req: Request, res: Response) {
    const images = await this.core.getPrisma().upload.findMany({
      where: { hash: "" },
      select: { name: true, id: true },
      take: 50,
    });

    const hashes = await Promise.all(
      images.map((image) =>
        getHash(`https://cdn.buildtheearth.net/uploads/${image.name}`)
      )
    );

    for (const [i, image] of images.entries()) {
      await this.core.getPrisma().upload.update({
        where: { id: image.id },
        data: {
          hash: hashes[i],
        },
      });
    }
    res.send({ count: images.length });
  }

  /**
   * Set the status of a uploaded image to checked (verfied that it doesnt show anything bad)
   */
  public async checkImage(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    if (!req.user) {
      return ERROR_NO_PERMISSION(req, res);
    }
    const image = await this.core.getPrisma().upload.update({
      where: {
        id: req.params.id,
      },
      data: { checked: true },
    });

    res.send(image);
  }
}

/**
 * Generates a base64 hash for an image
 * @param src Image URL
 * @returns Generated Has
 */
async function getHash(src: string) {
  
    const buffer = await fetch(src)
      .then(async (res) => Buffer.from(await res.arrayBuffer()))
      .catch((r) => console.error(`getHash error for ${src}: $${r}`));

    if (!buffer) return "";

    const { base64 } = await getPlaiceholder(buffer);
    return base64;
}

export default AdminController;
