import { NextFunction, Request, Response } from 'express';

import { PrismaClient } from '@prisma/client';
import Core from '../../../Core.js';

const checkNewUser = (prisma: PrismaClient, core: Core) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		if (!req.kauth.grant) {
			next();
			return;
		}
		let user = await prisma.user.findUnique({
			where: {
				ssoId: req.kauth.grant.access_token.content.sub,
			},
		});

		// If there is an user present in the DB -> Not first request
		if (user) {
			req.user = user;
			const kcUser = await core.getKeycloakAdmin().getKeycloakAdminClient().users.findOne({
				id: req.kauth.grant.access_token.content.sub,
			});

			req.kcUser = kcUser;

			// User has KC IdPs linked
			if (kcUser.federatedIdentities.length > 0) {
				const discordIdentity = kcUser.federatedIdentities.find((fi) => fi.identityProvider === 'discord');

				// User has discord IdP linked
				if (discordIdentity) {
					// Discord ID updated or not set
					if (user.discordId !== discordIdentity.userId) {
						const user = await prisma.user.update({
							where: {
								ssoId: req.kauth.grant.access_token.content.sub,
							},
							data: {
								discordId: discordIdentity.userId,
							},
						});
						req.user = user;
					}
				}
			} else {
				// Set Discord ID to "" when no Discord Linked
				const user = await prisma.user.update({
					where: {
						ssoId: req.kauth.grant.access_token.content.sub,
					},
					data: {
						discordId: '',
					},
				});
				req.user = user;
			}

			// TEMPORARY: Set kcUser attributes to user`s minecraft
			if (!kcUser.attributes?.minecraft) {
				await core
					.getKeycloakAdmin()
					.getKeycloakAdminClient()
					.users.update(
						{ id: req.kauth.grant.access_token.content.sub },
						{ attributes: { minecraft: user.name, minecraftVerified: false } },
					);
				req.kcUser = {
					...kcUser,
					attributes: { minecraft: [user.name], minecraftVerified: ['false'] },
				};
			}

			// User hast mc linked
			if (kcUser.attributes?.minecraft) {
				const minecraft = kcUser.attributes?.minecraft[0];
				if (minecraft != user.minecraft) {
					const user = await prisma.user.update({
						where: {
							ssoId: req.kauth.grant.access_token.content.sub,
						},
						data: {
							minecraft: minecraft,
						},
					});
					req.user = user;
				}
			}
		} else {
			// Get KC user
			const kcUser = await core.getKeycloakAdmin().getKeycloakAdminClient().users.findOne({
				id: req.kauth.grant.access_token.content.sub,
			});

			req.kcUser = kcUser;

			// Set kcUser attributes to empty values
			if (!kcUser.attributes?.minecraft) {
				await core
					.getKeycloakAdmin()
					.getKeycloakAdminClient()
					.users.update(
						{ id: req.kauth.grant.access_token.content.sub },
						{ attributes: { minecraft: '', minecraftVerified: false } },
					);
				req.kcUser = {
					...kcUser,
					attributes: { minecraft: [''], minecraftVerified: ['false'] },
				};
			}

			// User has discord IdP linked
			const discordIdentity = kcUser.federatedIdentities.find((fi) => fi.identityProvider === 'discord');

			// !! ONLY TO MIGRATE OLD WEBSITE BUILDERS
			const oldUser = await prisma.user.findFirst({
				where: { ssoId: 'o_' + discordIdentity.userId },
			});
			if (oldUser) {
				// Update migrated user
				await prisma.user.update({
					where: {
						id: oldUser.id,
					},
					data: {
						ssoId: req.kauth.grant.access_token.content.sub,
					},
				});
				req.user = oldUser;
			} else {
				// Create new user
				const user = await prisma.user.create({
					data: {
						ssoId: req.kauth.grant.access_token.content.sub,
						discordId: discordIdentity ? discordIdentity.userId : undefined,
					},
				});
				req.user = user;
			}

			// Create default Permission
			await prisma.userPermission.createMany({
				data: [
					{
						userId: req.user.id,
						permissionId: 'account.info',
					},
					{
						userId: req.user.id,
						permissionId: 'account.edit',
					},
				],
			});
		}
		next();
	};
};

export default checkNewUser;
