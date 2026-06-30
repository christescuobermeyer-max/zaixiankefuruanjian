import { Hono } from "hono";
import { authMiddleware } from "./middleware/auth.js";
import { corsMiddleware } from "./middleware/cors.js";
import { createChatRoute } from "./routes/chat.js";
import { createConversationsRoute } from "./routes/conversations.js";
import { healthRoute } from "./routes/health.js";
import { createChatService } from "./services/chat-service.js";
import { completeWithLlm } from "./services/llm.js";
import { mongo } from "./services/mongo.js";

type CreateAppOptions = {
  jwtSecret?: string;
  supabaseUrl?: string;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();

  app.route("/", healthRoute);
  app.use("/api/*", corsMiddleware());
  app.use(
    "/api/*",
    authMiddleware({
      jwtSecret: options.jwtSecret,
      supabaseUrl: options.supabaseUrl
    })
  );
  app.route("/api", createConversationsRoute());
  app.route(
    "/api",
    createChatRoute(
      createChatService({
        store: mongo,
        streamCompletion: completeWithLlm,
        summarize: async () => ""
      })
    )
  );

  return app;
}

export const app = createApp();
