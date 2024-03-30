import { PrismaClient } from "@prisma/client";
import runFetch from "./Fetcher.js";

export async function sendBtWebhook(
  url: string,
  type: WebhookType,
  content: any
) {
  await runFetch(url, { type, data: content });
}

export async function sendWebhook(
  prisma: PrismaClient,
  type: WebhookType,
  team: { slug: boolean; id: string },
  content: any
) {
  const { webhook } = await prisma.buildTeam.findUnique({
    where: team.slug ? { slug: team.id } : { id: team.id },
    select: {
      webhook: true,
    },
  });

  if (webhook) {
    return await sendBtWebhook(webhook, type, content);
  }
}

export const WebhookType = {
  APPLICATION: "APPLICATION",
  CLAIM_CREATE: "CLAIM_CREATE",
  CLAIM_UPDATE: "CLAIM_UPDATE",
  CLAIM_DELETE: "CLAIM_DELETE",
};

export type WebhookType = (typeof WebhookType)[keyof typeof WebhookType];
