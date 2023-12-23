import * as session from "express-session";
import * as winston from "winston";

import { PrismaClient } from "@prisma/client";
import Keycloak from "keycloak-connect";
import AmazonAWS from "./util/AmazonAWS.js";
import CronHandler from "./util/CronHandler.js";
import DiscordIntegration from "./util/DiscordIntegration.js";
import { rerenderFrontend } from "./util/Frontend.js";
import KeycloakAdmin from "./util/KeycloakAdmin.js";
import { middlewareUploadSrc } from "./util/Prisma.js";
import Web from "./web/Web.js";

class Core {
  web: Web;
  keycloak: Keycloak.Keycloak;
  memoryStore: session.MemoryStore;
  prisma: PrismaClient;
  keycloakAdmin: KeycloakAdmin;
  logger: winston.Logger;
  aws: AmazonAWS;
  discord: DiscordIntegration;
  cron: CronHandler;

  constructor() {
    this.setUpLogger();
    this.memoryStore = new session.MemoryStore();
    this.aws = new AmazonAWS(this);
    this.discord = new DiscordIntegration(
      this,
      process.env.DISCORD_WEBHOOK_URL,
      process.env.DISCORD_BOT_URL,
      process.env.DISCORD_BOT_SECRET
    );
    this.keycloak = new Keycloak(
      {
        store: this.memoryStore,
      },
      {
        "bearer-only": true,
        realm: process.env.KEYCLOAK_REALM,
        "auth-server-url": process.env.KEYCLOAK_URL,
        "ssl-required": "external",
        resource: process.env.KEYCLOAK_CLIENTID,
        "confidential-port": 0,
      }
    );
    this.keycloakAdmin = new KeycloakAdmin(this);
    this.keycloakAdmin.authKcClient().then(() => {
      this.getLogger().debug("Keycloak Admin is initialized.");
      this.prisma = new PrismaClient();
      this.prisma.$use(middlewareUploadSrc);
      this.web = new Web(this);
      this.web.startWebserver();
      this.cron = new CronHandler(this);
    });
  }

  public getLogger = (): winston.Logger => this.logger;

  public getKeycloak = (): Keycloak.Keycloak => this.keycloak;

  public getPrisma = (): PrismaClient => this.prisma;

  public getKeycloakAdmin = (): KeycloakAdmin => this.keycloakAdmin;

  public getAWS = (): AmazonAWS => this.aws;

  public getDiscord = (): DiscordIntegration => this.discord;

  private setUpLogger(): void {
    // const logger = this.getLogger();
    // logger.level = process.env.LOGLEVEL;
    const logger = winston.createLogger({
      level: process.env.LOGLEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: "logs/error.log",
          level: "error",
        }),
        new winston.transports.File({ filename: "logs/combined.log" }),
      ],
    });

    if (process.env.NODE_ENV !== "production") {
      const consoleFormat = winston.format.printf(
        ({ level, message, timestamp }) => {
          return `${timestamp} | ${level} » ${message}`;
        }
      );

      logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            consoleFormat
          ),
        })
      );
    }

    this.logger = logger;
  }
}

export default Core;
