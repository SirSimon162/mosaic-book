import express, { type Router } from "express";
import { requireAuth } from "../middleware/index.js";
import authRoutes from "../modules/auth/auth.route.js";
import healthRoutes from "../modules/health/health.route.js";
import userRoutes from "../modules/user/user.route.js";
import workspaceRoutes from "../modules/workspace/workspace.route.js";

const appRoutes: Router = express.Router();

appRoutes.use("/health", healthRoutes);
appRoutes.use("/auth", authRoutes);
appRoutes.use("/user", requireAuth, userRoutes);
appRoutes.use("/workspace", requireAuth, workspaceRoutes);

export default appRoutes;
