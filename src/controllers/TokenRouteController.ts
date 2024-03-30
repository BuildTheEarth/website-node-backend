import { Request, Response } from "express";
import { sendBtWebhook, WebhookType } from "../util/BtWebhooks.js";
import turf, { parseCoordinates, toPolygon } from "../util/Coordinates.js";
import { ERROR_GENERIC, ERROR_VALIDATION } from "../util/Errors.js";

import { ApplicationStatus } from "@prisma/client";
import { validationResult } from "express-validator";
import Core from "../Core.js";
import { parseApplicationStatus } from "../util/Parser.js";

class TokenRouteContoller {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  /**
   * Gets all claims of a build team based on the team and optional pagination
   */
  public async getClaims(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    // With Pagination
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      const claims = await this.core.getPrisma().claim.findMany({
        skip: page * 10,
        take: 10,
        where: {
          buildTeamId: req.team.id,
        },
        include: {
          _count: {
            select: { builders: true },
          },
          owner: { select: { id: true, discordId: true, ssoId: true } },
          builders: req.query.withBuilders
            ? { select: { id: true, discordId: true, ssoId: true } }
            : undefined,
        },
      });
      let count = await this.core.getPrisma().claim.count();
      res.send({ pages: Math.ceil(count / 10), data: claims });

      // Without Pagination
    } else {
      const claims = await this.core.getPrisma().claim.findMany({
        where: {
          buildTeamId: req.team.id,
        },
        include: {
          _count: {
            select: { builders: true },
          },
          owner: { select: { id: true, discordId: true, ssoId: true } },
          builders: req.query.withBuilders
            ? { select: { id: true, discordId: true, ssoId: true } }
            : undefined,
        },
      });
      res.send(claims);
    }
  }

  /**
   * Gets a single claim based on build team and id
   */
  public async getClaim(req: Request, res: Response) {
    const claim = await this.core.getPrisma().claim.findFirst({
      where: req.query.external
        ? { externalId: req.params.id, buildTeamId: req.team.id }
        : { id: req.params.id, buildTeamId: req.team.id },
      include: {
        _count: {
          select: { builders: true },
        },
        owner: { select: { id: true, discordId: true, ssoId: true } },
        builders: req.query.withBuilders
          ? { select: { id: true, discordId: true, ssoId: true } }
          : undefined,
      },
    });
    if (claim) {
      res.send(claim);
    } else {
      ERROR_GENERIC(req, res, 404, "Claim does not exist.");
    }
  }

  /**
   * Creates a new claim for a build team
   */
  public async createClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    let {
      owner: _owner,
      area,
      active,
      finished,
      name,
      externalId,
      description,
      buildings,
      city,
      builders,
    } = req.body;

    if (area[0] != area[area.length - 1]) {
      area.push(area[0]);
    }

    const owner =
      _owner && (await this.core.getPrisma().user.findFirst({ where: _owner }));

    if (_owner && !owner) {
      return ERROR_GENERIC(
        req,
        res,
        404,
        `Could not find an owner with the following properties: ${Object.keys(
          _owner
        ).join(", ")}`
      );
    }

    const center =
      area && turf.center(toPolygon(area)).geometry.coordinates.join(", ");

    const osmDetails = await this.core
      .getWeb()
      .getControllers()
      .claim.updateClaimOSMDetails({ name, center });

    const data = {
      owner: { connect: { id: owner.id } },
      buildTeam: { connect: { id: req.team.id } },
      builders: builders ? { connect: builders } : undefined,
      name: name,
      finished: finished,
      externalId: externalId,
      active: active,
      description: description,
      buildings:
        buildings ||
        (await this.core
          .getWeb()
          .getControllers()
          .claim.updateClaimBuildingCount({ area })),
      city: city || osmDetails.city,
      area: area,
      osmName: osmDetails.osmName,
      size: area && turf.area(toPolygon(area)),
      center: center,
    };

    try {
      const claim = await this.core.getPrisma().claim.create({
        data,
      });

      this.core.getDiscord().sendClaimUpdate(claim);
      res.send(claim);
    } catch (e) {
      ERROR_GENERIC(req, res, 500, e.message);
    }
  }

  // public async addClaims(req: Request, res: Response) {
  //   const errors = validationResult(req);
  //   if (!errors.isEmpty()) {
  //     return ERROR_VALIDATION(req, res, errors.array());
  //   }

  //   let claims = [];
  //   for (const c of req.body.data) {
  //     const owner = await this.core
  //       .getPrisma()
  //       .user.findFirst({ where: { name: c.owner } });
  //     if (owner) {
  //       c.owner = owner.id;
  //     } else {
  //       c.owner = undefined;
  //     }

  //     const area = parseCoordinates(
  //       c.area,
  //       (req.query.coordType as string) || "stringarray"
  //     );
  //     const claim = await this.core.getPrisma().claim.create({
  //       data: {
  //         id: c.id,
  //         owner: owner ? { connect: { id: owner.id } } : undefined,
  //         buildTeam: { connect: { id: req.params.team } },
  //         name: c.name,
  //         finished: c.finished,
  //         active: c.active,
  //         externalId: c.externalId,
  //         builders: c.builders
  //           ? { connect: c.builders.map((b: any) => ({ id: b })) }
  //           : undefined,
  //         area,
  //         size: area && turf.area(toPolygon(area)),
  //         center: turf.center(toPolygon(area)).geometry.coordinates.join(", "),
  //       },
  //     });
  //     claims.push(claim);
  //   }

  //   res.send({ data: claims });
  // }

  /**
   * Updates a claim from a build team based on the claim id
   */
  public async updateClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    let {
      owner: _owner,
      area,
      active,
      finished,
      name,
      externalId,
      description,
      buildings,
      city,
      builders,
    } = req.body;

    if (area[0] != area[area.length - 1]) {
      area.push(area[0]);
    }

    const owner =
      _owner && (await this.core.getPrisma().user.findFirst({ where: _owner }));

    if (_owner && !owner) {
      return ERROR_GENERIC(
        req,
        res,
        404,
        `Could not find an owner with the following properties: ${Object.keys(
          _owner
        ).join(", ")}`
      );
    }

    const center =
      area && turf.center(toPolygon(area)).geometry.coordinates.join(", ");

    const osmDetails =
      area &&
      (await this.core
        .getWeb()
        .getControllers()
        .claim.updateClaimOSMDetails({ name, center }));

    const data = {
      owner: owner && { connect: { id: owner.id } },
      builders: builders ? { set: builders } : undefined,
      name: name,
      finished: finished,
      externalId: externalId,
      active: active,
      description: description,
      buildings:
        buildings ||
        (area &&
          (await this.core
            .getWeb()
            .getControllers()
            .claim.updateClaimBuildingCount({ area }))),
      city: city || osmDetails.city,
      area: area,
      osmName: osmDetails.osmName,
      size: area && turf.area(toPolygon(area)),
      center: center,
    };

    try {
      const claim = await this.core.getPrisma().claim.update({
        where: req.query.external
        ? { externalId: req.params.id, buildTeamId: req.team.id }
        : { id: req.params.id, buildTeamId: req.team.id },
         
        data,
      });

      res.send(claim);
    } catch (e) {
      ERROR_GENERIC(req, res, 500, e.message);
    }
  }

  public async deleteClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    const claim = await this.core.getPrisma().claim.findFirst({
      where: req.query.external
        ? { externalId: req.params.id, buildTeamId: req.team.id }
        : { id: req.params.id, buildTeamId: req.team.id },
    });

    if (!claim) {
      ERROR_GENERIC(req, res, 404, "Claim does not exist.");
    }

    await this.core.getPrisma().claim.delete({ where: { id: claim.id } });

    this.core.getDiscord().sendClaimUpdate(claim);
    res.send(claim);
  }

  public async getApplications(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      const applications = await this.core.getPrisma().application.findMany({
        skip: page * 10,
        take: 10,
        where: {
          buildteamId: req.team.id,
        },
        include: {
          _count: {
            select: { ApplicationAnswer: true },
          },
          user: { select: { id: true, discordId: true, ssoId: true } },
        },
      });
      let count = await this.core.getPrisma().application.count();
      res.send({ pages: Math.ceil(count / 10), data: applications });
    } else {
      const applications = await this.core.getPrisma().application.findMany({
        where: {
          buildteamId: req.team.id,
        },
        include: {
          _count: {
            select: { ApplicationAnswer: true },
          },
          user: { select: { id: true, discordId: true, ssoId: true } },
        },
      });
      res.send(applications);
    }
  }
  public async getApplication(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    const application = await this.core.getPrisma().application.findFirst({
      where: {
        id: req.params.app,
        buildteamId: req.team.id,
      },
      include: {
        ApplicationAnswer: { include: { question: true } },
        user: {
          select: { id: true, discordId: true, ssoId: true, avatar: true },
        },
        reviewer: {
          select: { id: true, discordId: true, ssoId: true },
        },
      },
    });

    const kcReviewer = application.reviewer?.ssoId
      ? await this.core
          .getKeycloakAdmin()
          .getKeycloakAdminClient()
          .users.findOne({ id: application.reviewer.ssoId })
      : undefined;
    const kcUser = await this.core
      .getKeycloakAdmin()
      .getKeycloakAdminClient()
      .users.findOne({ id: application.user.ssoId });

    if (application) {
      res.send({
        ...application,
        reviewer: {
          ...application.reviewer,
          discordName: kcReviewer?.username,
        },
        user: { ...application.user, discordName: kcUser.username },
      });
    } else {
      ERROR_GENERIC(req, res, 404, "Application does not exist.");
    }
    return;
  }

  public async review(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    const { status, reason, reviewer: reviewerId } = req.body;

    const reviewer = await this.core
      .getPrisma()
      .user.findFirst({ where: { id: reviewerId } });

    if (!reviewer) {
      return ERROR_GENERIC(req, res, 404, "Reviewer does not exist.");
    }

    const application = await this.core.getPrisma().application.update({
      where: {
        id: req.params.id,
        buildteamId: req.team.id,
      },
      data: {
        reviewer: { connect: { id: reviewer.id } },
        reviewedAt: status != "REVIEWING" ? new Date() : null,
        status: parseApplicationStatus(status),
        reason,
      },
      include: {
        ApplicationAnswer: { include: { question: true } },
        buildteam: {
          select: {
            name: true,
            id: true,
            slug: true,
            acceptionMessage: true,
            rejectionMessage: true,
            trialMessage: true,
            webhook: true,
          },
        },
        user: { select: { id: true, discordId: true, name: true } },
        reviewer: { select: { id: true, discordId: true, name: true } },
      },
    });

    if (parseApplicationStatus(status) == ApplicationStatus.ACCEPTED) {
      const user = await this.core.getPrisma().user.update({
        where: { id: application.userId },
        data: {
          joinedBuildTeams: { connect: { id: application.buildteamId } },
        },
        select: { discordId: true },
      });

      await this.core
        .getDiscord()
        .sendBotMessage(
          this.core
            .getWeb()
            .getControllers()
            .application.mutateApplicationMessage(
              application.buildteam.acceptionMessage,
              application,
              user,
              application.buildteam
            ),
          [user.discordId],
          (e) => ERROR_GENERIC(req, res, 500, e)
        );
      await this.core.getDiscord().updateBuilderRole(user.discordId, true);
    } else if (parseApplicationStatus(status) == ApplicationStatus.TRIAL) {
      const user = await this.core.getPrisma().user.findFirst({
        where: { id: application.userId },
        select: { discordId: true },
      });
      await this.core
        .getDiscord()
        .sendBotMessage(
          this.core
            .getWeb()
            .getControllers()
            .application.mutateApplicationMessage(
              application.buildteam.trialMessage,
              application,
              user,
              application.buildteam
            ),
          [user.discordId],
          (e) => ERROR_GENERIC(req, res, 500, e)
        );
    } else {
      const user = await this.core.getPrisma().user.update({
        where: { id: application.userId },
        data: {
          joinedBuildTeams: { disconnect: { id: application.buildteamId } },
        },
        select: {
          discordId: true,
          _count: {
            select: { joinedBuildTeams: true },
          },
        },
      });

      await this.core
        .getDiscord()
        .sendBotMessage(
          this.core
            .getWeb()
            .getControllers()
            .application.mutateApplicationMessage(
              application.buildteam.rejectionMessage,
              application,
              user,
              application.buildteam
            ),
          [user.discordId],
          (e) => ERROR_GENERIC(req, res, 500, e)
        );

      if (user._count.joinedBuildTeams < 1) {
        await this.core
          .getDiscord()
          .updateBuilderRole(user.discordId, false, (e) =>
            ERROR_GENERIC(req, res, 500, e)
          );
      }
    }

    await this.core.getDiscord().sendApplicationUpdate(application);

    if (application.buildteam.webhook) {
      await sendBtWebhook(
        this.core,
        application.buildteam.webhook,
        WebhookType.APPLICATION,
        application
      );
    }

    res.send(application);
  }
}

export default TokenRouteContoller;
