import Core from "../Core.js";

export async function sendBtWebhook(
  core: Core,
  url: string,
  type: WebhookType,
  content: any,
) {
  if (url) {
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ type, data: content }),
      });
      core.getLogger().info(`Sent ${type} to ${url}`);
    } catch (e) {
      core.getLogger().error(`Failed to send ${type} to ${url}: ${e}`);
      return false;
    }
  }
}

export async function sendWebhook(
  core: Core,
  type: WebhookType,
  team: { slug: boolean; id: string },
  content: any,
) {
  const { webhook } = await core.getPrisma().buildTeam.findUnique({
    where: team.slug ? { slug: team.id } : { id: team.id },
    select: {
      webhook: true,
    },
  });

  if (webhook) {
    return await sendBtWebhook(core, webhook, type, content);
  }
}

export const WebhookType = {
  APPLICATION: "APPLICATION",
  APPLICATION_SEND: "APPLICATION_SEND",
  CLAIM_CREATE: "CLAIM_CREATE",
  CLAIM_UPDATE: "CLAIM_UPDATE",
  CLAIM_DELETE: "CLAIM_DELETE",
};

export type WebhookType = (typeof WebhookType)[keyof typeof WebhookType];
