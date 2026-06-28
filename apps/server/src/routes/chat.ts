import { Hono } from "hono";
import type { AppBindings } from "../types/hono.js";

type ChatRouteService = {
  streamChat(input: { userId: string; conversationId: string; message: string }): Promise<Response>;
};

export function createChatRoute(service: ChatRouteService) {
  const route = new Hono<AppBindings>();

  route.post("/chat", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!conversationId || !message) {
      return c.json({ error: "conversationId and message are required" }, 400);
    }

    return service.streamChat({
      userId: c.get("userId"),
      conversationId,
      message
    });
  });

  return route;
}
