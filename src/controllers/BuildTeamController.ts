import {Request, Response} from "express";

import Core from "../Core.js";
import {questions} from "../util/QuestionData.js";
import { userHasPermission } from "../web/routes/utils/CheckUserPermissionMiddleware.js";
import { validationResult } from "express-validator";
import yup from "yup";

class BuildTeamController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getBuildTeams(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      const buildteams = await this.core.getPrisma().buildTeam.findMany({
        skip: page * 10,
        take: 10,
        include: {
          _count: {
            select: { members: true, builds: true },
          },
        },
      });
      let count = await this.core.getPrisma().buildTeam.count();
      res.send({ pages: Math.ceil(count / 10), data: buildteams });
    } else {
      const buildteams = await this.core.getPrisma().buildTeam.findMany({
        include: {
          _count: {
            select: { members: true, builds: true },
          },
        },
      });
      res.send(buildteams);
    }
  }

  public async getBuildTeam(req: Request, res: Response) {
    const buildteam = await this.core.getPrisma().buildTeam.findFirst({
      where: { id: req.params.id },
      include: {
        socials: true,
        builds: req.query.builds ? true : false,
        showcases: req.query.showcase ? true : false,
        members: req.query.members ? true : false,
        _count: {
          select: { members: true, builds: true },
        },
      },
    });
    if (buildteam) {
      res.send(buildteam);
    } else {
      res.status(404).send({
        code: 404,
        message: "Buildteam does not exit.",
        translationKey: "404",
      });
    }
  }

  public async getBuildTeamApplicationQuestion(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        applicationQuestions: true,
      },
    });

    if (buildteam) {
      res.send(buildteam.applicationQuestions);
    } else {
      res.status(404).send({
        code: 404,
        message: "Buildteam does not exit.",
        translationKey: "404",
      });
    }
  }

  public async updateBuildTeamApplicationQuestions(
    req: Request,
    res: Response
  ) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        applicationQuestions: true,
      },
    });

    if (buildteam) {
      // validate schema

      let schema = yup.array().of(
        yup.object({
          id: yup.string(),
          additionalData: yup.array().of(yup.mixed().oneOf(questions)),
          title: yup.string(),
          subtitle: yup.string(),
          placeholder: yup.string(),
          required: yup.boolean().default(false),
          icon: yup.string(),
          sort: yup.number(),
        })
      );

      schema
        .validate(req.body)
        .then((validatedSchema) => {
          validatedSchema.forEach((question) => {
            this.core.getPrisma().applicationQuestion.update({
              where: {
                id: question.id,
              },
              data: question,
            });
          });

          res.send(validatedSchema);
        })
        .catch((e) => {
          res.status(400).send(e);
        });
    } else {
      res.status(404).send({
        code: 404,
        message: "Buildteam does not exit.",
        translationKey: "404",
      });
    }
  }

  public async getBuildTeamSocials(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        socials: true,
      },
    });

    if (buildteam) {
      res.send(buildteam.socials);
    } else {
      res.status(404).send({
        code: 404,
        message: "Buildteam does not exit.",
        translationKey: "404",
      });
    }
  }

  public async updateBuildTeamSocials(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let buildteam = await this.core.getPrisma().buildTeam.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        socials: true,
      },
    });

    if (buildteam) {
      // validate schema

      let schema = yup.array().of(
        yup.object({
          id: yup.string(),
          name: yup.string(),
          icon: yup.string(),
          url: yup.string(),
        })
      );

      schema
        .validate(req.body)
        .then((validatedSchema) => {
          validatedSchema.forEach((question) => {
            this.core.getPrisma().social.update({
              where: {
                id: question.id,
              },
              data: question,
            });
          });

          res.send(validatedSchema);
        })
        .catch((e) => {
          res.status(400).send(e);
        });
    } else {
      res.status(404).send({
        code: 404,
        message: "Buildteam does not exit.",
        translationKey: "404",
      });
    }
  }

  public async updateBuildTeam(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      icon,
      backgroundImage,
      invite,
      about,
      location,
      allowTrial,
      slug,
      acceptionMessage,
      rejectionMessage,
      trialMessage,
    } = req.body;
    console.log(req.body);
    const buildteam = await this.core.getPrisma().buildTeam.update({
      where: { id: req.params.id },
      data: {
        name,
        icon,
        backgroundImage,
        invite,
        about,
        location,
        allowTrial,
        slug,
        acceptionMessage,
        rejectionMessage,
        trialMessage,
      },
    });
    res.send(buildteam);
  }

  public async apply(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  }
}

export default BuildTeamController
