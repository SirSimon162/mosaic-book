import express, { type Express } from "express";
import cors, { CorsOptions } from "cors";
import { errorHandler, notFound } from "./middleware/index.js";
import appRoutes from "./routes/index.js";
import cookieParser from "cookie-parser";
export const app: Express = express();

const corsOptions: CorsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(cookieParser());

app.use("/api", appRoutes);

app.use(notFound);
app.use(errorHandler);
