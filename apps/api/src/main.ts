import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config } from "./backend/config.js";
import { connectDatabase, mongo } from "./backend/database.js";
try {
  await connectDatabase();
  const server = serve({
    fetch: app.fetch,
    port: config.PORT,
    hostname: "127.0.0.1",
  });
  console.log(`Tellme API ready on http://127.0.0.1:${config.PORT}`);
  const shutdown = () =>
    server.close(() => {
      void mongo.close().then(() => process.exit(0));
    });
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
} catch (error) {
  console.error(
    "API startup failed. Check MongoDB access and environment configuration.",
    { type: error instanceof Error ? error.name : "UnknownError" },
  );
  process.exit(1);
}
