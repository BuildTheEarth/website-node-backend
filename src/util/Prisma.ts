import { PrismaClient } from "@prisma/client";
import Core from "../Core.js";

export async function middlewareUploadSrc(params, next) {
  const result = await next(params);
  if (params.model == "Upload") {
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
