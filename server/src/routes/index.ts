import express, { type Router } from "express";
import authRoutes from "../modules/auth/auth.route.js";

const appRoutes: Router = express.Router();

appRoutes.use("/auth", authRoutes);

export default appRoutes;
