import { getLogger } from "log4js";
import Web from "./web/Web";
class Core {

    web: Web;
    constructor() {
        this.setUpLogger();
        this.web = new Web(this);
        this.web.startWebserver();
    }

    private setUpLogger() {
        const logger = this.getLogger();
        logger.level = process.env.loglevel;
    }

    public getLogger() {
        return getLogger();
    }

}

export default Core;
