import { Request, Response } from "express";
import { ERROR_GENERIC, ERROR_VALIDATION } from "../util/Errors.js";
import { FrontendRoutesGroups, rerenderFrontend } from "../util/Frontend.js";

import { validationResult } from "express-validator";
import { selectFields } from "express-validator/src/select-fields.js";
import { connect } from "http2";
import Core from "../Core.js";

class BlogController {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public async getBlogPosts(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    if (req.query && req.query.page) {
      let page = parseInt(req.query.page as string);
      const blogPosts = await this.core.getPrisma().blog.findMany({
        skip: page * 10,
        take: 10,
        include: {
          author: {
            select: {
              id: true,
              discordId: true,
              avatar: true,
              username: true,
              minecraft: true,
              ssoId: true,
            },
          },
        },
      });
      let count = await this.core.getPrisma().blog.count();
      res.send({ pages: Math.ceil(count / 10), data: blogPosts });
    } else {
      const blogPosts = await this.core.getPrisma().blog.findMany({
        include: {
          author: {
            select: {
              id: true,
              discordId: true,
              avatar: true,
              username: true,
              minecraft: true,
              ssoId: true,
            },
          },
        },
      });
      res.send(blogPosts);
    }
  }

  public async getBlogPost(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }
    const blogPost = await this.core.getPrisma().blog.findUnique({
      where: req.query.slug
        ? { slug: req.params.id }
        : {
            id: req.params.id,
          },
      include: {
        author: {
          select: {
            id: true,
            discordId: true,
            avatar: true,
            username: true,
            minecraft: true,
            ssoId: true,
          },
        },
      },
    });
    if (blogPost) {
      res.send(blogPost);
    } else {
      ERROR_GENERIC(req, res, 404, "Blog Post does not exist.");
    }
    return;
  }

  public async createBlogPost(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ERROR_VALIDATION(req, res, errors.array());
    }

    const blogPost = await this.core.getPrisma().blog.create({
      data: {
        title: req.body.title,
        publishedAt: new Date(),
        public: req.body.public ? req.body.public : true,
        content: req.body.content,
        summary: req.body.summary,
        slug: req.body.slug,
        author: {
          connect: {
            id: req.body.authorId,
          },
        },
        thumbnail: {
          connect: {
            id: req.body.thumbnailId,
          },
        },
      },
      include: {
        author: {
          select: {
            id: true,
            discordId: true,
            avatar: true,
            username: true,
            minecraft: true,
            ssoId: true,
          },
        },
        thumbnail: { select: {} },
      },
    });

    rerenderFrontend(FrontendRoutesGroups.FAQ, {
      slug: blogPost.slug,
    });
    res.send(blogPost);
  }
}

export default BlogController;
