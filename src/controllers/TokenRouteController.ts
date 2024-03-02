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

  public async getClaims(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }
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

  public async getClaim(req: Request, res: Response) {
    const claim = await this.core.getPrisma().claim.findFirst({
      where: { id: req.params.id, buildTeamId: req.team.id },
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
      ERROR_GENERIC(res, 404, "Claim does not exist.");
    }
  }

  public async addClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    let { owner, area, active, finished, name, id, builders, externalId } =
      req.body;

    if (area[0] != area[area.length - 1]) {
      area.push(area[0]);
    }

    if (typeof area[0] === "string") {
      area = area.map((p: string) =>
        p.split(", ").map((s: string) => parseFloat(s))
      );
    }
    const o = await this.core
      .getPrisma()
      .user.findFirst({ where: { name: owner } });

    if (!o) {
      return ERROR_GENERIC(res, 404, "Owner does not exist.");
    }

    const claim = await this.core.getPrisma().claim.create({
      data: {
        id,
        owner: { connect: { id: o.id } },
        buildTeam: { connect: { id: req.team.id } },
        builders: builders
          ? { connect: builders.map((b: any) => ({ id: b })) }
          : undefined,
        name,
        finished,
        externalId,
        active,
        area: area,
        size: area && turf.area(toPolygon(area)),
        center: area
          ? turf.center(toPolygon(area)).geometry.coordinates.join(", ")
          : undefined,
      },
    });

    this.core.getDiscord().sendClaimUpdate(claim);
    res.send(claim);
  }

  public async addClaims(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    let claims = [];
    for (const c of req.body.data) {
      const owner = await this.core
        .getPrisma()
        .user.findFirst({ where: { name: c.owner } });
      if (owner) {
        c.owner = owner.id;
      } else {
        c.owner = undefined;
      }

      const area = parseCoordinates(
        c.area,
        (req.query.coordType as string) || "stringarray"
      );
      const claim = await this.core.getPrisma().claim.create({
        data: {
          id: c.id,
          owner: owner ? { connect: { id: owner.id } } : undefined,
          buildTeam: { connect: { id: req.params.team } },
          name: c.name,
          finished: c.finished,
          active: c.active,
          externalId: c.externalId,
          builders: c.builders
            ? { connect: c.builders.map((b: any) => ({ id: b })) }
            : undefined,
          area,
          size: area && turf.area(toPolygon(area)),
          center: turf.center(toPolygon(area)).geometry.coordinates.join(", "),
        },
      });
      claims.push(claim);
    }

    res.send({ data: claims });
  }

  public async updateClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    let { owner, area, active, finished, name, id, builders } = req.body;

    if (area) {
      if (area[0] != area[area.length - 1]) {
        area.push(area[0]);
      }

      if (typeof area[0] === "string") {
        area = area.map((p: string) =>
          p.split(", ").map((s: string) => parseFloat(s))
        );
      }
    }

    const claim = await this.core.getPrisma().claim.update({
      where: { id: req.params.id },
      data: {
        ownerId: owner,
        buildTeamId: req.team.id,
        builders: { set: builders.map((b: any) => ({ id: b })) },
        name,
        finished,
        active,
        area: area,
        size: area && turf.area(toPolygon(area)),
        center: area
          ? turf.center(toPolygon(area)).geometry.coordinates.join(", ")
          : undefined,
      },
    });

    res.send(claim);
  }

  public async removeClaim(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const claim = await this.core.getPrisma().claim.findFirst({
      where: { id: req.params.id, buildTeamId: req.team.id },
    });

    if (!claim) {
      ERROR_GENERIC(res, 404, "Claim does not exist.");
    }

    await this.core.getPrisma().claim.delete({ where: { id: claim.id } });

    this.core.getDiscord().sendClaimUpdate(claim);
    res.send(claim);
  }

  public async getApplications(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
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
      return ERROR_VALIDATION(res, errors.array());
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
      ERROR_GENERIC(res, 404, "Application does not exist.");
    }
    return;
  }

  public async review(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(res, errors.array());
    }

    const { status, reason, reviewer: reviewerId } = req.body;

    const reviewer = await this.core
      .getPrisma()
      .user.findFirst({ where: { id: reviewerId } });

    if (!reviewer) {
      return ERROR_GENERIC(res, 404, "Reviewer does not exist.");
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
          (e) => ERROR_GENERIC(res, 500, e)
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
          (e) => ERROR_GENERIC(res, 500, e)
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
          (e) => ERROR_GENERIC(res, 500, e)
        );

      if (user._count.joinedBuildTeams < 1) {
        await this.core
          .getDiscord()
          .updateBuilderRole(user.discordId, false, (e) =>
            ERROR_GENERIC(res, 500, e)
          );
      }
    }

    await this.core.getDiscord().sendApplicationUpdate(application);

    if (application.buildteam.webhook) {
      sendBtWebhook(
        application.buildteam.webhook,
        WebhookType.APPLICATION,
        application
      );
    }

    res.send(application);
  }
}

export default TokenRouteContoller;
