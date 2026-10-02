import { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE } from "../utils/assign-cookie.js";
import { Status } from "../lib/http-code.js";
import { sendFail } from "../lib/api-response.js";
import { verifyAccessToken } from "../utils/jwt.js";

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies[AUTH_COOKIE]
    if (!token) {
        return sendFail(res, Status.UNAUTHORIZED, "Unauthorized")
    }
    try {
        const decoded = verifyAccessToken(token)
        if (!decoded) {
            return sendFail(res, Status.UNAUTHORIZED, "Unauthorized")
        }
        req.userId = decoded.sub
        return next()
    } catch (e) {
        return sendFail(res, Status.UNAUTHORIZED, "Unauthorized")
    }
}

export default requireAuth;