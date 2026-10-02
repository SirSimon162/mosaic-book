import express, { type Router } from "express";
import authRoutes from "../modules/auth/auth.route.js";
import healthRoutes from "../modules/health/health.route.js";
import userRoutes from "../modules/user/user.route.js";
import { requireAuth } from "../middleware/index.js";

const appRoutes: Router = express.Router();

appRoutes.use("/health", healthRoutes);
appRoutes.use("/auth", authRoutes);
appRoutes.use("/user", requireAuth, userRoutes)

export default appRoutes;
