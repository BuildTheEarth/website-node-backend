import KcAdminClient from "@keycloak/keycloak-admin-client";
import Core from "../Core.js";

class KeycloakAdmin {
  private kcAdminClient: KcAdminClient;
  private core: Core;

  constructor(core: Core) {
    this.core = core;
    this.kcAdminClient = new KcAdminClient({
      baseUrl: process.env.KEYCLOAK_URL,
      realmName: process.env.KEYCLOAK_REALM,
    });
  }

  public getKeycloakAdminClient() {
    return this.kcAdminClient;
  }

  public async authKcClient() {
    return await this.kcAdminClient.auth({
      grantType: "client_credentials",
      clientId: process.env.KEYCLOAK_CLIENTID,
      clientSecret: process.env.KEYCLOAK_CLIENTSECRET,
    });
  }
}

export default KeycloakAdmin;
