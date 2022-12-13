import {Request, Response} from "express";
import Core from "../Core.js";

class BuildTeamController {

    private core: Core;

    constructor(core: Core) {
        this.core = core;
    }

    public async getBuildTeams(req: Request, res: Response) {
        if (req.query && req.query.page) {
            let page = parseInt(req.query.page as string);
            const buildteams = await this.core.getPrisma().buildTeam.findMany({
                skip: page * 10,
                take: 10,
                include: {
                    _count: {
                        select: { members: true, builds: true }
                    }
                }
            });
            let count = await this.core.getPrisma().buildTeam.count();
            res.send({pages: Math.ceil(count / 10), data: buildteams});
        } else {
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
}

export default BuildTeamController
