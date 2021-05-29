import Core from "../Core";
import { Sequelize } from 'sequelize-typescript'
import User from "./models/User";

class Database {
    core: Core;
    sequelize: Sequelize;
    constructor(core: Core) {
        this.core = core;
    }
    public async connectToDB(): Promise<void> {
        this.core.getLogger().info(`Trying to connect to DB (${process.env.db_host})`);
        this.sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            dialect: "mariadb",
            models: [__dirname + '/models']
        });
        this.sequelize.authenticate()
            .then(() => {
                this.core.getLogger().info("Connected to DB successfully! Trying to create tables!");
                return this.syncModels();
            })
            .catch((e) => {
                this.core.getLogger().error("Connection to DB failed! Please check the host, port, username, password and database!");
                this.core.getLogger().error(e);
                process.exit();
            });
    }

    private async syncModels(): Promise<void> {
        return await this.sequelize.sync({force: true}).then(() => this.core.getLogger().debug("Model sync successful."));
    }
}

export default Database;
