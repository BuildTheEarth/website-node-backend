import { Application, ApplicationStatus, Claim } from "@prisma/client";

import Core from "../Core.js";

class DiscordIntegration {
  private webhookUrl: string;
  private core: Core;

  constructor(core: Core, webhookUrl: string) {
    this.core = core;
    this.webhookUrl = webhookUrl;
  }

  public getWebhookUrl() {
    return this.webhookUrl;
  }

  public async sendWebhook(props: { embeds?: DiscordWebhookEmbed[]; content?: string; type: string }) {
    await this.sendRawWebhook({ embeds: props.embeds, content: props.content, username: discordWebhookType[props.type].username });
  }

  public async sendRawWebhook(content: any) {
    return fetch(this.webhookUrl, {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(content),
    });
  }

  public sendClaimUpdate(claim: Claim) {
    this.sendRawWebhook({
      embeds: [
        {
          title: claim.name,
          url: process.env.FRONTEND_URL + `/map?claim=` + claim.id,
          color: discordWebhookType.claim.color,
          fields: [
            {
              name: "Finished",
              value: claim.finished ? "✅" : "❌",
              inline: true,
            },
            {
              name: "Active",
              value: claim.active ? "✅" : "❌",
              inline: true,
            },
          ],
          author: {
            name: "Claim updated",
          },
          timestamp: claim.createdAt,
        },
      ],
      username: discordWebhookType.claim.username,
    });
  }
}

export const discordWebhookType = {
  error: {
    username: "Website - Error",
    color: 15744574,
  },
  warning: {
    username: "Website - Warning",
    color: 16213767,
  },
  sucess: {
    username: "Website - Sucess",
    color: 3650125,
  },
  buildteam: {
    username: "Website - Teams",
    color: 7358696,
  },
  contact: {
    username: "Website - Contacts",
    color: 829048,
  },
  claim: {
    username: "Website - Claims",
    color: 16097024,
  },
  application: {
    username: "Website - Applications",
    color: 11419337,
  },
};

interface DiscordWebhookEmbed {
  title?: string;
  description?: string;
  timestamp?: string;
  username?: string;
  url?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
}

export default DiscordIntegration;
