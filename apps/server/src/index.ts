import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadLocalEnv } from "./config/dotenv.js";
import { loadServerEnv } from "./config/env.js";
import { mongo } from "./services/mongo.js";

loadLocalEnv();
const env = loadServerEnv();
const app = createApp({
  jwtSecret: env.supabaseJwtSecret,
  supabaseUrl: env.supabaseUrl
});

await mongo.ensureIndexes();

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`API server listening on http://127.0.0.1:${info.port}`);
});
