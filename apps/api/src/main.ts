import { serve } from "@hono/node-server";
import { app } from "./app";

const port = Number(process.env.PORT) || 4000;

console.log(`🚀 Tellme API Server running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });
