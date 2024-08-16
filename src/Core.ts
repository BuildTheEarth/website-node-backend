import * as session from "express-session";
import * as winston from "winston";

import { Prisma, PrismaClient } from "@prisma/client";
import {
  DefaultArgs,
  DynamicClientExtensionThis,
  InternalArgs,
} from "@prisma/client/runtime/library";
import { LIB_LICENSE, LIB_VERSION } from "./util/package.js";
import {
  applicationReminder,
  purgeClaims,
  purgeVerifications,
} from "./util/Prisma.js";

import Keycloak from "keycloak-connect";
import AmazonAWS from "./util/AmazonAWS.js";
import CronHandler from "./util/CronHandler.js";
import DiscordIntegration from "./util/DiscordIntegration.js";
import KeycloakAdmin from "./util/KeycloakAdmin.js";
import Web from "./web/Web.js";

class Core {
  web: Web;
  keycloak: Keycloak.Keycloak;
  memoryStore: session.MemoryStore;
  prisma: ExtendedPrismaClient;
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
      this.prisma = new PrismaClient().$extends({
        name: "uploadSrc",
        result: {
          upload: {
            src: {
              needs: { name: true },
              compute: (upload) => {
                return `https://cdn.buildtheearth.net/uploads/${upload.name}`;
              },
            },
          },
        },
      });
      // this.prisma.$use(middlewareUploadSrc);
      this.web = new Web(this);
      this.web.startWebserver();
      this.cron = new CronHandler(this, [
        {
          id: "purge_claims",
          params: {
            cronTime: "1 */24 * * *",
            start: true,
            onTick: () => purgeClaims(this),
          },
        },
        {
          id: "remind_application",
          params: {
            cronTime: "1 1 */14 * *",
            start: true,
            onTick: () => applicationReminder(this),
          },
        },
        {
          id: "purge_verifications",
          params: {
            cronTime: "1 */24 * * *",
            start: true,
            onTick: () => purgeVerifications(this),
          },
        },
      ]);
    });
  }

  public getLogger = (): winston.Logger => this.logger;

  public getKeycloak = (): Keycloak.Keycloak => this.keycloak;

  public getPrisma = (): ExtendedPrismaClient => this.prisma;

  public getKeycloakAdmin = (): KeycloakAdmin => this.keycloakAdmin;

  public getAWS = (): AmazonAWS => this.aws;

  public getDiscord = (): DiscordIntegration => this.discord;

  public getCron = (): CronHandler => this.cron;

  public getWeb = (): Web => this.web;

  private setUpLogger(): void {
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
    logger.info(
      "Initializing BuildTheEarth.net API" +
        "\n\n" +
        "[107;40m[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;022m,[38;5;022m,[38;5;022m,[38;5;022m,[38;5;022m,[38;5;022m,[38;5;022m,[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@[38;5;254m@\n" +
        "[38;5;254m@[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&[38;5;017m.[38;5;022m,[38;5;022m,[38;5;022m,[38;5;002m,[38;5;002m,[38;5;002m,[38;5;002m,[38;5;002m,[38;5;002m,[38;5;024m,[38;5;233m [38;5;002m,[38;5;004m,[38;5;004m,[38;5;017m.[38;5;017m.[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&\n" +
        "[38;5;254m@[38;5;254m&[38;5;254m&[38;5;254m&[38;5;017m.[38;5;004m,[38;5;024m,[38;5;024m,[38;5;233m [38;5;028m*[38;5;028m*[38;5;028m*[38;5;028m*[38;5;028m*[38;5;028m*[38;5;028m*[38;5;028m*[38;5;028m*[38;5;002m,[38;5;002m,[38;5;002m,[38;5;002m,[38;5;022m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;017m.[38;5;254m&[38;5;254m&[38;5;254m&" +
        "          BuildTheEarth.net API\n" +
        "[38;5;254m@[38;5;254m&[38;5;017m.[38;5;004m,[38;5;024m,[38;5;024m*[38;5;024m*[38;5;024m*[38;5;025m*[38;5;070m*[38;5;071m*[38;5;071m*[38;5;070m*[38;5;070m*[38;5;028m*[38;5;028m*[38;5;028m*[38;5;028m*[38;5;028m*[38;5;002m,[38;5;002m,[38;5;024m,[38;5;024m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;017m.[38;5;254m&\n" +
        "[38;5;254m@[38;5;017m.[38;5;004m,[38;5;024m,[38;5;024m*[38;5;024m*[38;5;024m*[38;5;025m*[38;5;025m*[38;5;025m*[38;5;233m [38;5;071m*[38;5;071m*[38;5;071m*[38;5;065m*[38;5;024m*[38;5;024m*[38;5;233m [38;5;233m [38;5;028m*[38;5;002m,[38;5;024m,[38;5;024m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;060m*" +
        `          Version ${LIB_VERSION}\n` +
        "[38;5;017m.[38;5;004m,[38;5;024m,[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;025m*[38;5;025m*[38;5;025m*[38;5;025m*[38;5;025m*[38;5;025m*[38;5;233m [38;5;002m,[38;5;028m*[38;5;024m*[38;5;024m*[38;5;024m,[38;5;024m,[38;5;024m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;017m," +
        `          Released under ${LIB_LICENSE}\n` +
        "[38;5;017m.[38;5;024m,[38;5;024m,[38;5;024m,[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;022m.[38;5;238m,[38;5;233m [38;5;002m,[38;5;022m.[38;5;234m.[38;5;022m.[38;5;234m.[38;5;237m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;017m.\n" +
        "[38;5;017m.[38;5;004m,[38;5;024m,[38;5;024m,[38;5;024m,[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;024m*[38;5;235m.[38;5;002m,[38;5;002m,[38;5;002m,[38;5;022m,[38;5;022m,[38;5;022m,[38;5;022m,[38;5;022m,[38;5;023m,[38;5;023m,[38;5;023m,[38;5;004m,[38;5;017m.[38;5;017m.\n" +
        "[38;5;254m@[38;5;017m.[38;5;004m,[38;5;024m,[38;5;024m,[38;5;024m,[38;5;024m,[38;5;024m,[38;5;024m,[38;5;024m,[38;5;024m,[38;5;024m,[38;5;024m,[38;5;024m,[38;5;024m,[38;5;004m,[38;5;234m [38;5;022m,[38;5;022m,[38;5;022m,[38;5;022m,[38;5;022m,[38;5;023m,[38;5;023m,[38;5;023m,[38;5;023m,[38;5;023m,[38;5;023m,[38;5;017m.[38;5;060m*\n" +
        "[38;5;254m@[38;5;254m&[38;5;017m.[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;233m [38;5;023m,[38;5;023m,[38;5;023m,[38;5;023m,[38;5;023m,[38;5;023m,[38;5;023m,[38;5;017m,[38;5;017m.[38;5;254m&\n" +
        "[38;5;254m@[38;5;254m&[38;5;254m&[38;5;254m&[38;5;017m.[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;004m,[38;5;233m [38;5;023m,[38;5;023m,[38;5;023m,[38;5;023m,[38;5;017m.[38;5;017m.[38;5;017m.[38;5;254m&[38;5;254m&[38;5;254m&\n" +
        "[38;5;254m@[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&[38;5;017m.[38;5;060m/[38;5;060m/[38;5;060m/[38;5;060m/[38;5;235m.[38;5;235m.[38;5;004m,[38;5;004m,[38;5;017m.[38;5;017m.[38;5;233m [38;5;023m,[38;5;023m,[38;5;023m,[38;5;017m.[38;5;017m.[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&[38;5;254m&\n" +
        "[0m"
    );

    this.logger = logger;
  }
}

export default Core;

export type ExtendedPrismaClient =
  | PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>
  | DynamicClientExtensionThis<
      Prisma.TypeMap<
        InternalArgs & {
          result: {
            upload: {
              src: () => {
                needs: { name: true };
                compute: (upload: { name: string }) => string;
              };
            };
          };
          model: {};
          query: {};
          client: {};
        }
      >,
      Prisma.TypeMapCb,
      {
        result: {
          upload: {
            src: () => {
              needs: { name: true };
              compute: (upload: { name: string }) => string;
            };
          };
        };
        model: {};
        query: {};
        client: {};
      }
    >;