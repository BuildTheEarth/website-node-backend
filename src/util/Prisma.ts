import { ApplicationStatus } from "@prisma/client";
import Core from "../Core.js";

export async function middlewareUploadSrc(params, next) {
  const result = await next(params);
  if (params.model == "Upload" && params.action != "count") {
    result.src = `https://cdn.buildtheearth.net/uploads/${result.name}`;
  }
  return result;
}

export async function purgeClaims(core: Core) {
  const prisma = core.getPrisma();

  const handle = async () => {
    const emptyClaims = await prisma.claim.deleteMany({
      where: { center: null },
    });
    if (emptyClaims.count > 0)
      core.getLogger().info(`Purged ${emptyClaims.count} emtpy Claims`);

    const noRefClaims = await prisma.claim.deleteMany({
      where: { externalId: null, ownerId: null },
    });

    if (noRefClaims.count > 0)
      core.getLogger().info(`Purged ${noRefClaims.count} unreferenced Claims`);
  };

  handle().then(() => {});
}

export async function applicationReminder(core: Core) {
  const prisma = core.getPrisma();

  const handle = async () => {
    const applications = await prisma.application.findMany({
      where: {
        status: ApplicationStatus.SEND,
        createdAt: { lte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        // buildteamId: "558820c6-ce4f-4281-9e02-95779d4edb40",
      },
      select: {
        buildteam: {
          select: {
            name: true,
            slug: true,
            UserPermission: {
              where: { permissionId: "team.application.notify" },
              select: { user: { select: { discordId: true } } },
            },
          },
        },
        id: true,
        createdAt: true,
        user: { select: { discordId: true, minecraft: true } },
        trial: true,
      },
    });
    const groupedApplications: any = {};

    for (const application of applications) {
      const bt = application.buildteam.slug;

      if (!groupedApplications[bt]) {
        groupedApplications[bt] = [];
      }

      groupedApplications[bt].push(application);
    }

    Object.values(groupedApplications).forEach((apps: any) => {
      const content = apps?.map(
        (app) =>
          `- ${new Date(app.createdAt).toLocaleDateString("en-us", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
          })}: <@${app.user.discordId}> (${
            app.user.minecraft
          }) Review it [here](${process.env.FRONTEND_URL}/teams/${
            app.buildteam.slug
          }/manage/review/${app.id})`
      );
      core.getDiscord().sendBotMessage(
        `**Application reminder for ${
          apps[0].buildteam.name
        }** \\nHere is a list of Applications that are older than two weeks. Please review them: \\n${content.join(
          " \\n"
        )}`,
        apps[0].buildteam.UserPermission.map((u) => u.user.discordId),
        (e) => core.getLogger().error(e)
      );
      console.log(
        apps[0].buildteam.name,
        apps[0].buildteam.UserPermission.map((u) => u.user.discordId)
      );
    });

    return applications;
  };

  handle().then(() => {});
}
