import {Request, Response} from "express";
import Core from "../Core";

class BuildTeamController {

    private core: Core;

    constructor(core: Core) {
        this.core = core;
    }

    public async getBuildTeams(req: Request, res: Response) {
        const buildteams = await this.core.getPrisma().buildTeam.findMany({
            include: {
                creator: true,
                members: true,
                builds: true,
                socials: true,
                showcases: true
            }
        });
        res.send(buildteams)
    }
}

export default BuildTeamController
