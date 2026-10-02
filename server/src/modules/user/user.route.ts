import express, { type Request, type Router, type Response } from "express";
import { Status } from "../../lib/http-code.js";
import { sendSuccess } from "../../lib/api-response.js";
import { getUserByUserId } from "./user.service.js";

const userRoutes: Router = express.Router();

userRoutes.get("/me", async (req: Request, res: Response) => {
    const user = await getUserByUserId(req.userId!)
    return sendSuccess(res, Status.OK, user)
})

export default userRoutes;