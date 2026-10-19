import {
    type NextFunction,
    type Request,
    type Response,
} from "express";
import AppError from "../lib/http-error.js";
import { Status } from "../lib/http-code.js";
import { requireUserId } from "../types/authed-request.js";
import { workspaceIdParamSchema } from "../modules/workspace/workspace.types.js";
import { isWorkspaceOwner, isWorkspaceUser } from "../modules/workspace/workspace.repository.js";

export async function requireWorkspaceUserAccess(
    req: Request,
    _res: Response,
    next: NextFunction,
) {
    const params = workspaceIdParamSchema.safeParse(req.params);
    if (!params.success) {
        throw new AppError("Invalid input", Status.BAD_REQUEST);
    }
    const allowed = await isWorkspaceUser(params.data.workspaceId, requireUserId(req));
    if (!allowed) {
        throw new AppError("Workspace not found", Status.NOT_FOUND);
    }
    next();
}

export async function requireWorkspaceOwnerAccess(
    req: Request,
    _res: Response,
    next: NextFunction,
) {
    const params = workspaceIdParamSchema.safeParse(req.params);
    if (!params.success) {
        throw new AppError("Invalid input", Status.BAD_REQUEST);
    }

    const user = await isWorkspaceUser(params.data.workspaceId, requireUserId(req));
    if (!user) {
        throw new AppError("Workspace not found", Status.NOT_FOUND);
    }

    const allowed = await isWorkspaceOwner(params.data.workspaceId, requireUserId(req));
    if (!allowed) {
        throw new AppError("You are not authorized to access this workspace", Status.FORBIDDEN);
    }
    next();
}