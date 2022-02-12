import {getLogger, Logger} from 'log4js';
import Web from './web/Web';
import * as Keycloak from "keycloak-connect";
import * as session from "express-session";
import { PrismaClient } from '@prisma/client'
import KeycloakAdmin from "./util/KeycloakAdmin";

class Core {
    web: Web;
    keycloak: Keycloak.Keycloak;
    memoryStore: session.MemoryStore;
    prisma: PrismaClient;
    keycloakAdmin: KeycloakAdmin;

    constructor() {
        this.setUpLogger();
        this.memoryStore = new session.MemoryStore();
        this.keycloak = new Keycloak({
            store: this.memoryStore
        })
        this.keycloakAdmin = new KeycloakAdmin(this);
        this.keycloakAdmin.authKcClient().then(() => {
            this.getLogger().debug("Keycloak Admin is initialized.")
            this.prisma = new PrismaClient();
            this.web = new Web(this);
            this.web.startWebserver();
        })





    }

    private setUpLogger(): void {
        const logger = this.getLogger();
        logger.level = process.env.loglevel;
    }

    public getLogger = (): Logger => getLogger();
    public getKeycloak = (): Keycloak.Keycloak => this.keycloak;
    public getPrisma = (): PrismaClient => this.prisma;
    public getKeycloakAdmin = (): KeycloakAdmin => this.keycloakAdmin;
}

export default Core;
