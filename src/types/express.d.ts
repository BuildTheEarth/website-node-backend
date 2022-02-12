import {GrantProperties} from "keycloak-connect";

interface kAuth {
    grant: any;
}
declare global {
    namespace Express {
        interface Request {
            kauth: kAuth
        }
    }
}
