import { Application, ApplicationStatus, Claim, User } from "@prisma/client";

import Core from "../Core.js";

class DiscordIntegration {
  private webhookUrl: string;
  private botUrl: string;
  private botSecret: string;
  private core: Core;

  constructor(
    core: Core,
    webhookUrl: string,
    botUrl: string,
    botSecret: string
  ) {
    this.core = core;
    this.webhookUrl = webhookUrl;
    this.botUrl = botUrl;
    this.botSecret = botSecret;
  }

  public getWebhookUrl() {
    return this.webhookUrl;
  }
  public getBotUrl() {
    return this.botUrl;
  }

  public async sendWebhook(props: {
    embeds?: DiscordWebhookEmbed[];
    content?: string;
    type: string;
  }) {
    await this.sendRawWebhook({
      embeds: props.embeds,
      content: props.content,
      username: discordWebhookType[props.type].username,
    });
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

  public async sendBotMessage(
    content: any,
    users: string[],
    errorCallback?: (error: any) => void
  ) {
    try {
      await fetch(this.botUrl + "/api/v1/website/message/blank", {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${this.botSecret}`,
        },
        body: JSON.stringify({ params: { text: content }, ids: users }),
      });
      return true;
    } catch (e) {
      this.core.getLogger().error(e);
      errorCallback(e);
      return false;
    }
  }

  public async updateBuilderRole(
    user: string,
    isBuilder: boolean,
    errorCallback?: (error: any) => void
  ) {
    try {
      await fetch(this.botUrl + `/api/v1/builder/${user}`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${this.botSecret}`,
        },
        body: JSON.stringify({ add: isBuilder }),
      });
      return true;
    } catch (e) {
      this.core.getLogger().error(e);
      errorCallback(e);
      return false;
    }
  }

  public async getBuilderRole(user: string) {
    return fetch(this.botUrl + `/api/v1/builder/${user}`, {
      method: "GET",
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${this.botSecret}`,
      },
    }).then((res) => res.json());
  }

  public async isOnServer(user: string) {
    const res = await this.getBuilderRole(user);
    if (res?.error == "NOT_FOUND") {
      return false;
    }
    return true;
  }

  public async sendClaimUpdate(claim: Claim) {
    return this.sendRawWebhook({
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

  public async getUserPunishments(user: string) {
    return fetch(this.botUrl + `/api/v1/punish/${user}`, {
      method: "GET",
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${this.botSecret}`,
      },
    }).then((res) => res.json());
  }

  public async getUserRoles(user: string) {
    return fetch(this.botUrl + `/api/v1/role/${user}`, {
      method: "GET",
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${this.botSecret}`,
      },
    }).then((res) => res.json());
  }

  public async sendApplicationUpdate(application: any) {
    return this.sendRawWebhook({
      embeds: [
        {
          title:
            application.id.split("-")[0] + " - " + application.buildteam.name,
          url:
            process.env.FRONTEND_URL +
            `/teams/${application.buildteam.id}/manage/review/${application.id}`,
          color: discordWebhookType.application.color,
          fields: [
            {
              name: "Trial Application",
              value: application.trial ? "✅" : "❌",
              inline: true,
            },
            {
              name: "Application Status",
              value: application.status,
              inline: true,
            },
            application.reason && {
              name: "Rejection Reason",
              value: application.reason,
              inline: false,
            },
          ],
          author: {
            name: "Application reviewed",
          },
          timestamp: application.reviewedAt,
        },
      ],
      username: discordWebhookType.application.username,
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
