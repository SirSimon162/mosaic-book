import { app } from "./app.js";
import { environment } from "./config/index.js";
import { ensureVectorIndex } from "./lib/vector.js";

const PORT = environment.PORT;

await ensureVectorIndex();

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`Server is shutting down`);
  server.close(() => {
    console.log(`Server has been closed on ${signal}`);
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
