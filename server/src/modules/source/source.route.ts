import express, {
    type NextFunction,
    type Request,
    type Response,
    type Router,
} from "express";

const sourceRoutes: Router = express.Router({ mergeParams: true });

sourceRoutes.get("/", async (req, res) => { })

sourceRoutes.post("/", async (req, res) => { })

sourceRoutes.post("/bulk-delete", async (req, res) => { })

sourceRoutes.get("/:sourceId", async (req, res) => { })

sourceRoutes.delete("/:sourceId", async (req, res) => { })

export default sourceRoutes;