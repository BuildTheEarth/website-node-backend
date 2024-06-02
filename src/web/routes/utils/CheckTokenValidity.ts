import { NextFunction, Request, Response } from 'express';

import { PrismaClient } from '@prisma/client';
import { ERROR_NO_PERMISSION } from '../../../util/Errors.js';

export const checkTokenValidity = (prisma: PrismaClient, buildteam: string) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		if (!req.params[buildteam]) {
			ERROR_NO_PERMISSION(req, res, 'No token was provided in Authorization');
			return;
		}
		const authHeader = req.headers.authorization;

		if (!authHeader) {
			ERROR_NO_PERMISSION(req, res, 'No authorization header, please use api keys for public routes.');
			return;
		}

		const authToken = authHeader.toString().split(' ')[1];

		if (!authToken) {
			ERROR_NO_PERMISSION(req, res, 'Invalid authorization header, please use api keys for public routes.');
			return;
		}

		const tokenTeam = await prisma.buildTeam.findFirst({
			where: req.query.slug ? { slug: req.params[buildteam] } : { id: req.params[buildteam] },
		});

		if (!tokenTeam) {
			ERROR_NO_PERMISSION(req, res, 'Invalid token was provided in Authorization');
			return;
		}

		if (tokenTeam.token !== authToken) {
			ERROR_NO_PERMISSION(req, res);
			return;
		}

		req.team = tokenTeam;
		next();
	};
};
