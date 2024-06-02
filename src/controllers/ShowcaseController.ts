import { Request, Response } from 'express';
import { ERROR_GENERIC, ERROR_VALIDATION } from '../util/Errors.js';
import { FrontendRoutesGroups, rerenderFrontend } from '../util/Frontend.js';

import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { validationResult } from 'express-validator';
import Core from '../Core.js';
import { userHasPermissions } from '../web/routes/utils/CheckUserPermissionMiddleware.js';

class ShowcaseController {
	private core: Core;

	constructor(core: Core) {
		this.core = core;
	}

	public async getShowcases(req: Request, res: Response) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return ERROR_VALIDATION(req, res, errors.array());
		}

		const showcases = await this.core.getPrisma().showcase.findMany({
			where: {
				buildTeam: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
			},
			include: {
				image: true,
			},
		});
		res.send(showcases);
	}

	public async getAllShowcases(req: Request, res: Response) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return ERROR_VALIDATION(req, res, errors.array());
		}

		const showcases = await this.core.getPrisma().showcase.findMany({
			include: {
				image: true,
				buildTeam: {
					select: {
						name: true,
						location: true,
						slug: true,
						icon: true,
						id: true,
					},
				},
			},
		});
		res.send(showcases);
	}

	public async getRandomShowcases(req: Request, res: Response) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return ERROR_VALIDATION(req, res, errors.array());
		}

		const showcases = await this.core.getPrisma().showcase.findMany({
			include: {
				image: true,
				buildTeam: {
					select: {
						name: true,
						location: true,
						slug: true,
						icon: true,
						id: true,
					},
				},
			},
			where: req.query.approved
				? {
						approved: req.query.approved === 'true',
					}
				: {},
		});

		const randomIndexes = [];

		while (randomIndexes.length < parseInt(req.query.limit as string)) {
			const randomIndex = Math.floor(Math.random() * showcases.length);
			if (!randomIndexes.includes(randomIndex)) {
				randomIndexes.push(randomIndex);
			}
		}

		res.send(showcases.filter((s, index) => randomIndexes.includes(index)));
	}

	public async deleteShowcase(req: Request, res: Response) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return ERROR_VALIDATION(req, res, errors.array());
		}

		const showcase = await this.core.getPrisma().showcase.findFirst({
			where: { id: req.params.id },
			include: {
				image: true,
			},
		});

		if (!showcase) {
			ERROR_GENERIC(req, res, 404, 'Showcase does not exist.');
		}

		const fileKey = showcase.image.name;

		let delUpload;
		const delShowcase = await this.core.getPrisma().showcase.delete({
			where: { id: showcase.id },
		});

		try {
			delUpload = await this.core.getPrisma().upload.delete({
				where: { id: showcase.image.id, claimId: null },
			});
		} catch (e) {
			delUpload = {
				message: 'Upload not deleted because it is linked to an claim',
			};
			return res.send([delUpload, delShowcase]);
		}
		const command = new DeleteObjectCommand({
			Bucket: this.core.getAWS().getS3Bucket(false),
			Key: fileKey,
		});
		await this.core.getAWS().getS3Client().send(command);
		res.send([delUpload, delShowcase]);
	}

	public async createShowcase(req: Request, res: Response) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return ERROR_VALIDATION(req, res, errors.array());
		}

		const upload = await this.core.getAWS().uploadFile(req.file);
		const showcase = await this.core.getPrisma().showcase.create({
			data: {
				title: req.body.title,
				city: req.body.city,
				image: { connect: { id: upload.id } },
				buildTeam: {
					connect: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
				},
				createdAt: req.body.date,
			},
			select: { image: true },
		});

		rerenderFrontend(FrontendRoutesGroups.TEAM, { team: req.params.id });

		res.send(showcase);
	}

	public async linkShowcase(req: Request, res: Response) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return ERROR_VALIDATION(req, res, errors.array());
		}

		const upload = await this.core.getPrisma().upload.findFirst({ where: { id: req.body.image } });

		if (!upload) {
			ERROR_GENERIC(req, res, 404, 'Image does not exist.');
		}

		const showcase = await this.core.getPrisma().showcase.create({
			data: {
				title: req.body.title,
				city: req.body.city,
				image: { connect: { id: upload.id } },
				buildTeam: {
					connect: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
				},
				createdAt: req.body.date,
			},
			select: { image: true },
		});

		rerenderFrontend(FrontendRoutesGroups.TEAM, { team: req.params.id });

		res.send(showcase);
	}

	public async editShowcase(req: Request, res: Response) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return ERROR_VALIDATION(req, res, errors.array());
		}
		const isAdmin = await userHasPermissions(this.core.getPrisma(), req.user.ssoId, ['admin.admin']);

		const showcase = await this.core.getPrisma().showcase.update({
			where: {
				id: req.params.id,
				buildTeam: req.query.slug ? { slug: req.params.team } : { id: req.params.team },
			},
			data: {
				title: req.body.title,
				city: req.body.city,
				createdAt: req.body.date,
				approved: isAdmin ? req.body.approved : undefined,
			},
			select: { image: true },
		});

		rerenderFrontend(FrontendRoutesGroups.TEAM, { team: req.params.id });

		res.send(showcase);
	}
}

export default ShowcaseController;
