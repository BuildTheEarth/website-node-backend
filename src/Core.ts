import * as session from "express-session";
import * as winston from "winston";

import AmazonAWS from "./util/AmazonAWS.js";
import Keycloak from "keycloak-connect";
import KeycloakAdmin from "./util/KeycloakAdmin.js";
import { PrismaClient } from "@prisma/client";
import Web from "./web/Web.js";
import { middlewareUploadSrc } from "./util/Prisma.js";

class Core {
  web: Web;
  keycloak: Keycloak.Keycloak;
  memoryStore: session.MemoryStore;
  prisma: PrismaClient;
  keycloakAdmin: KeycloakAdmin;
  logger: winston.Logger;
  aws: AmazonAWS;

  constructor() {
    this.setUpLogger();
    this.memoryStore = new session.MemoryStore();
    this.aws = new AmazonAWS(this);
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
    });
  }

  public getLogger = (): winston.Logger => this.logger;

  public getKeycloak = (): Keycloak.Keycloak => this.keycloak;

  public getPrisma = (): PrismaClient => this.prisma;

  public getKeycloakAdmin = (): KeycloakAdmin => this.keycloakAdmin;

  public getAWS = (): AmazonAWS => this.aws;

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
