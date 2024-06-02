import { Application, ApplicationQuestionType, ApplicationStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { sendBtWebhook, WebhookType } from '../util/BtWebhooks.js';
import { ERROR_GENERIC, ERROR_NO_PERMISSION, ERROR_VALIDATION } from '../util/Errors.js';

import { validationResult } from 'express-validator';
import Core from '../Core.js';
import { parseApplicationStatus } from '../util/Parser.js';
import { userHasPermissions } from '../web/routes/utils/CheckUserPermissionMiddleware.js';

class ApplicationController {
	private core: Core;

	constructor(core: Core) {
		this.core = core;
	}
	public async getApplications(req: Request, res: Response) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return ERROR_VALIDATION(req, res, errors.array());
		}

		if (!req.user) {
			return ERROR_NO_PERMISSION(req, res);
		}

		let applications = await this.core.getPrisma().application.findMany({
			where: {
				buildteam: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
				status: req.query.review ? { in: [ApplicationStatus.SEND, ApplicationStatus.REVIEWING] } : undefined,
			},
		});

		res.send(applications);
	}

	public async getUserApplications(req: Request, res: Response) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return ERROR_VALIDATION(req, res, errors.array());
		}

		if (!req.user) {
			return ERROR_NO_PERMISSION(req, res);
		}

		let applications = await this.core.getPrisma().application.findMany({
			where: {
				userId: req.params.user as string,
				buildteam: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
			},
		});

		const user = await this.core.getPrisma().user.findUnique({
			where: {
				id: req.params.user as string,
			},
		});

		if (req.query.pending) {
			applications = applications.filter(
				(a) => a.status == ApplicationStatus.REVIEWING || a.status == ApplicationStatus.SEND,
			);
		}

		if (user.ssoId == req.kauth.grant.access_token.content.sub) {
			res.send(applications);
		} else if (
			await userHasPermissions(
				this.core.getPrisma(),
				req.kauth.grant.access_token.content.sub,
				['team.application.list'],
				req.query.id as string,
			)
		) {
			res.send(applications);
		} else {
			ERROR_NO_PERMISSION(req, res);
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
				buildteam: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
			},
			include: {
				ApplicationAnswer: req.query.includeAnswers === 'true' ? { include: { question: true } } : undefined,
				user:
					req.query.includeUser === 'true'
						? {
								select: {
									id: true,
									discordId: true,
									ssoId: true,
									minecraft: true,
								},
							}
						: undefined,
				reviewer: {
					select: { id: true, discordId: true, ssoId: true },
				},
			},
		});

		const kcReviewer = application.reviewer?.ssoId
			? await this.core.getKeycloakAdmin().getKeycloakAdminClient().users.findOne({ id: application.reviewer.ssoId })
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
			ERROR_GENERIC(req, res, 404, 'Application does not exist.');
		}
		return;
	}

	public async review(req: Request, res: Response) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return ERROR_VALIDATION(req, res, errors.array());
		}

		const { status, reason } = req.body;
		const reviewer = req.user;

		const application = await this.core.getPrisma().application.update({
			where: {
				id: req.params.app,
			},
			data: {
				reviewer: { connect: { id: reviewer.id } },
				reviewedAt: status != 'REVIEWING' ? new Date() : null,
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
				user: {
					select: { id: true, discordId: true, name: true, minecraft: true },
				},
				reviewer: {
					select: { id: true, discordId: true, name: true, minecraft: true },
				},
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
					this.mutateApplicationMessage(
						application.buildteam.acceptionMessage,
						application,
						user,
						application.buildteam,
					),
					[user.discordId],
					(e) => ERROR_GENERIC(req, res, 500, e),
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
					this.mutateApplicationMessage(application.buildteam.trialMessage, application, user, application.buildteam),
					[user.discordId],
					(e) => ERROR_GENERIC(req, res, 500, e),
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
					this.mutateApplicationMessage(
						application.buildteam.rejectionMessage,
						application,
						user,
						application.buildteam,
					),
					[user.discordId],
					(e) => ERROR_GENERIC(req, res, 500, e),
				);

			if (user._count.joinedBuildTeams < 1) {
				await this.core.getDiscord().updateBuilderRole(user.discordId, false, (e) => ERROR_GENERIC(req, res, 500, e));
			}
		}

		await this.core.getDiscord().sendApplicationUpdate(application);

		if (application.buildteam.webhook) {
			sendBtWebhook(this.core, application.buildteam.webhook, WebhookType.APPLICATION, application);
		}

		res.send(application);
	}

	public async apply(req: Request, res: Response) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return ERROR_VALIDATION(req, res, errors.array());
		}
		if (!req.user) {
			ERROR_NO_PERMISSION(req, res);
		}

		if (!(await this.core.getDiscord().isOnServer(req.user.discordId))) {
			ERROR_GENERIC(req, res, 428, 'Please join the BuildTheEarth.net Discord Server');
			return;
		}

		let buildteam = await this.core.getPrisma().buildTeam.findUnique({
			where: req.query.slug ? { slug: req.params.id } : { id: req.params.id },
			select: {
				instantAccept: true,
				applicationQuestions: true,
				id: true,
				slug: true,
				name: true,
				acceptionMessage: true,
				token: false,
				allowApplications: true,
			},
		});

		if (buildteam) {
			const pastApplications = await this.core.getPrisma().application.findMany({
				where: { userId: req.user.id, buildteamId: buildteam.id },
			});
			const answers = req.body;
			const trial = req.query.trial ? true : false;
			const validatedAnswers = [];

			// User is already accepted to the buildteam
			if (pastApplications.some((a) => a.status == ApplicationStatus.ACCEPTED)) {
				return ERROR_GENERIC(req, res, 409, 'You are already a builder of this BuildTeam.');

				// User already applied, waiting for review
			} else if (
				pastApplications.some((a) => a.status == ApplicationStatus.REVIEWING || a.status == ApplicationStatus.SEND)
			) {
				return ERROR_GENERIC(req, res, 409, 'You already have an pending application for this BuildTeam.');

				// Double trial application
			} else if (pastApplications.some((a) => a.status == ApplicationStatus.TRIAL) && trial) {
				return ERROR_GENERIC(req, res, 409, 'You are already a trial of this BuildTeam.');
			}

			if (!buildteam.allowApplications) {
				return ERROR_GENERIC(req, res, 403, 'BuildTeam has disabled applications.');
			}

			if (buildteam.instantAccept) {
				const application = await this.core.getPrisma().application.create({
					data: {
						buildteam: { connect: { id: buildteam.id } },
						user: { connect: { id: req.user.id } },
						status: ApplicationStatus.ACCEPTED,
						createdAt: new Date(),
						reviewedAt: new Date(),
						trial: false,
					},
				});

				await this.core
					.getDiscord()
					.sendBotMessage(
						this.mutateApplicationMessage(buildteam.acceptionMessage, application, req.user, buildteam),
						[req.user.discordId],
						(e) => ERROR_GENERIC(req, res, 500, e),
					);
			}

			for (const question of buildteam.applicationQuestions) {
				// Filter by correct questions
				if (question.trial == trial) {
					if (answers[question.id]) {
						// TODO: validate answer type
						let answer = answers[question.id];
						const type = question.type;

						if (typeof answer != 'string') {
							if (typeof answer == 'number') {
								answer = answer.toString();
							} else {
								try {
									answer = JSON.stringify(answer);
								} catch (e) {}
							}
						}
						validatedAnswers.push({ id: question.id, answer: answer });

						if (type == ApplicationQuestionType.MINECRAFT) {
							if (req.kcUser.attributes.minecraftVerified?.at(0) == 'true') {
								if (req.kcUser.attributes.minecraft?.at(0) != answer) {
									return ERROR_GENERIC(
										req,
										res,
										400,
										'Minecraft username is not equal to verified username on profile.',
									);
								}
							} else {
								await this.core
									.getKeycloakAdmin()
									.getKeycloakAdminClient()
									.users.update(
										{ id: req.kcUser.id },
										{
											attributes: {
												minecraft: answer,
												minecraftVerified: false,
											},
										},
									);
								req.kcUser = {
									...req.kcUser,
									attributes: {
										minecraft: [answer],
										minecraftVerified: ['false'],
									},
								};
							}
						}
					} else if (question.required && question.sort >= 0) {
						return ERROR_GENERIC(req, res, 400, 'Required Questions are missing.');
					}
				}
			}

			if (validatedAnswers.length >= 0) {
				const application = await this.core.getPrisma().application.create({
					data: {
						buildteam: { connect: { id: buildteam.id } },
						user: { connect: { id: req.user.id } },
						status: ApplicationStatus.SEND,
						createdAt: new Date(),
						trial: trial,
						ApplicationAnswer: {
							createMany: {
								data: validatedAnswers.map((a) => ({
									answer: a.answer,
									questionId: a.id,
								})),
							},
						},
					},
					include: {
						buildteam: { select: { webhook: true } },
						ApplicationAnswer: { include: { question: true } },
						reviewer: true,
						user: true,
					},
				});

				const reviewers = await this.core.getPrisma().userPermission.findMany({
					where: {
						permissionId: 'team.application.notify',
						buildTeamId: buildteam.id,
					},
					select: { user: { select: { id: true, discordId: true } } },
				});

				await this.core.getDiscord().sendBotMessage(
					`**${buildteam.name}** \\nNew Application from <@${req.user.discordId}> (${req.kcUser.username}). Review it [here](${process.env.FRONTEND_URL}/teams/${buildteam.slug}/manage/review/${application.id})`,
					reviewers.map((r) => r.user.discordId),
					(e) => ERROR_GENERIC(req, res, 500, e),
				);

				if (application.buildteam.webhook) {
					sendBtWebhook(this.core, application.buildteam.webhook, WebhookType.APPLICATION_SEND, application);
				}

				res.send(application);
			} else {
				return ERROR_GENERIC(req, res, 400, 'Questions are missing.');
			}
		} else {
			ERROR_GENERIC(req, res, 404, 'BuildTeam does not exist.');
		}
	}

	public mutateApplicationMessage(
		message: string,
		application: Application,
		user: { discordId: string },
		team: { slug: string; name: string },
	): string {
		return message
			.replace('{user}', `<@${user.discordId}>`)
			.replace('{team}', team.name)
			.replace('{url}', process.env.FRONTEND_URL + `/teams/${team.slug}`)
			.replace('{reason}', application.reason)
			.replace(
				'{reviewedAt}',
				new Date(application.reviewedAt).toLocaleDateString('en-GB', {
					year: 'numeric',
					month: 'numeric',
					day: 'numeric',
				}),
			)
			.replace(
				'{createdAt}',
				new Date(application.createdAt).toLocaleDateString('en-GB', {
					year: 'numeric',
					month: 'numeric',
					day: 'numeric',
				}),
			)
			.replace('{id}', application.id.toString().split('-')[0]);
	}
}

export default ApplicationController;
