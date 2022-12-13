import {Request, Response} from "express";
import Core from "../Core.js";

class BuildTeamController {

    private core: Core;

    constructor(core: Core) {
        this.core = core;
    }

    public async getBuildTeams(req: Request, res: Response) {
        const buildteams = await this.core.getPrisma().buildTeam.findMany({
            include: {
                _count: {
                    select: { members: true, builds: true }
                }
            }
        });
        res.send(buildteams);
    }
}

export default BuildTeamController
