import { ApplicationQuestionType } from "@prisma/client";
import Core from "../Core.js";
import runFetch from "./Fetcher.js";

export async function sendBtWebhook(
  url: string,
  type: WebhookType,
  content: any
) {
  await runFetch(url, { type, data: content });
}

export const WebhookType = {
  APPLICATION: "APPLICATION",
};

export type WebhookType = typeof WebhookType[keyof typeof WebhookType];
