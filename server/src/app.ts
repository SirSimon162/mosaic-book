import express, { type Express } from "express";
import cors, { CorsOptions } from "cors";
import { serve } from "inngest/express";
import { errorHandler, notFound } from "./middleware/index.js";
import appRoutes from "./routes/index.js";
import cookieParser from "cookie-parser";
import { inngest } from "./lib/inngest.js";
import { processSource } from "./inngest/process-source.js";
export const app: Express = express();

const corsOptions: CorsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(cookieParser());

app.use("/api/inngest", serve({ client: inngest, functions: [processSource] }));
app.use("/api", appRoutes);

app.use(notFound);
app.use(errorHandler);
