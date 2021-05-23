import Core from "./src/Core";

require('dotenv').config();

let core = new Core();
core.getLogger().info("Starting BTE.NET backend")

