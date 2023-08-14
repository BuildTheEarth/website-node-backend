import {Request, Response} from "express";

import Core from "../Core.js";
import {validationResult} from "express-validator";

class UserController {
    private core: Core;

    constructor(core: Core) {
        this.core = core;
    }

    public async getUsers(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }
        if (req.query && req.query.page) {
            let page = parseInt(req.query.page as string);
            const users = await this.core.getPrisma().user.findMany({
                skip: page * 10,
                take: 10,
            });
            let count = await this.core.getPrisma().user.count();
            res.send({pages: Math.ceil(count / 10), data: users});
        } else {
            const users = await this.core.getPrisma().user.findMany({});
            res.send(users);
        }
    }

    public async getPermissions(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }
        const permissions = await this.core
            .getPrisma()
            .userPermission.findMany({where: {userId: req.params.id}});
        res.send(permissions);
    }

  public async addPermissions(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    let permissions = await this.core
      .getPrisma()
      .userPermission.findMany({ where: { userId: req.params.id } });
    let addedPermissions = [];
    for (let i = 0; i < req.body.permissions.length; i++) {
      const newPermission = req.body.permissions[i];
      let hasPermission = permissions.some((currentPermission) => {
        return currentPermission.permission == newPermission;
      });
      if (!hasPermission) {
        addedPermissions.push(newPermission);
        await this.core.getPrisma().userPermission.create({
          data: {
            permission: newPermission,
            user: {
              connect: {
                id: req.params.id,
              },
            },
          },
        });
        addedPermissions.push(newPermission);
      }
    }

    res
      .send(
        JSON.stringify({ added: addedPermissions, permissions: permissions })
      )
      .status(200);
  }

  public async removePermission(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let permissions = await this.core
      .getPrisma()
      .userPermission.findMany({ where: { userId: req.params.id } });
    let permissionsToRemove = [];
    for (let i = 0; i < req.body.permissions.length; i++) {
      const permissionToDelete = req.body.permissions[i];
      let idOfPermissionToDelete;
      let hasPermissions = permissions.some((currentPermission) => {
        if(currentPermission.permission == permissionToDelete) {
          idOfPermissionToDelete = currentPermission.id;
          return true;
        }
      });
      


      if (hasPermissions) {
        permissionsToRemove.push(permissionToDelete);

        await this.core.getPrisma().userPermission.delete({
          where: {
            id: idOfPermissionToDelete
          },
        });
        permissionsToRemove.push(permissionToDelete);
      }
    }

    res
      .send(
        JSON.stringify({
          removed: permissionsToRemove,
          permissions: permissions,
        })
      )
      .status(200);
  }
}

export default UserController;
