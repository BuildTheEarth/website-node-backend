import {getLogger, Logger} from "log4js";
import Web from "./web/Web";
import Database from "./db/Database";
class Core {

    web: Web;
    database: Database
    constructor() {
        this.setUpLogger();
        this.database = new Database(this);
        this.setupDB().then(r => {
            this.web = new Web(this);
            this.web.startWebserver();
        });

    }

    private setUpLogger(): void {
        const logger = this.getLogger();
        logger.level = process.env.loglevel;
    }

    private async setupDB(): Promise<void> {
        await this.database.connectToDB();
    }

    public getLogger(): Logger {
        return getLogger();
    }

}

export default Core;
