// import "./src/util/SentryInstrument.js";

import * as dotenv from "dotenv";

import Core from "./src/Core.js";

dotenv.config();

export const core = new Core();
