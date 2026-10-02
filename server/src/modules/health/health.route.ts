import express, { type Router, type Request, type Response } from "express";
import { sendSuccess } from "../../lib/api-response.js";
import { Status } from "../../lib/http-code.js";

const healthRoutes: Router = express.Router();

healthRoutes.get("/", async (req: Request, res: Response) => {
    return sendSuccess(res, Status.OK, "HEALTH: OK")
})

export default healthRoutes