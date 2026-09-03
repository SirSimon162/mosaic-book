import express, { type ErrorRequestHandler, type Express, type Request, type RequestHandler, type Response } from "express";
import cors, { CorsOptions } from "cors";
import AppError from "./lib/http-error.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

export const app: Express = express();

const corsOptions: CorsOptions = {
    origin: "http://localhost:3000",
    credentials: true,
}
app.use(cors(corsOptions))


app.get("/api", (req: Request, res: Response) => {
    res.send("Hello World")
})
app.all("/api/auth/{*path}", toNodeHandler(auth));

app.use(express.json())

const notFound: RequestHandler = (req, res, next) => {
    next(new AppError("Not Found", 404));
};

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err instanceof AppError ? err.message : "Internal Server Error";

    res.status(statusCode).json({
        message,
        statusCode,
    });
};

app.use(notFound);
app.use(errorHandler);