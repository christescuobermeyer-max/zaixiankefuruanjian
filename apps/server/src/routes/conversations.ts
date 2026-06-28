import { Hono } from "hono";
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  searchConversations
} from "../services/conversation-service.js";
import { mongo } from "../services/mongo.js";
import type { ConversationDto, MessageDto } from "../types/domain.js";
import type { AppBindings } from "../types/hono.js";

type ConversationRouteService = {
  createConversation(userId: string, name: string): Promise<ConversationDto>;
  listConversations(userId: string): Promise<ConversationDto[]>;
  searchConversations(userId: string, query: string): Promise<ConversationDto[]>;
  listMessages(userId: string, conversationId: string): Promise<MessageDto[] | null>;
  deleteConversation(userId: string, conversationId: string): Promise<boolean>;
};

export function createConversationRouteService(): ConversationRouteService {
  return {
    createConversation: (userId, name) => createConversation(mongo, userId, name),
    listConversations: (userId) => listConversations(mongo, userId),
    searchConversations: (userId, query) => searchConversations(mongo, userId, query),
    listMessages: (userId, conversationId) => listMessages(mongo, userId, conversationId),
    deleteConversation: (userId, conversationId) => deleteConversation(mongo, userId, conversationId)
  };
}

export function createConversationsRoute(
  service: ConversationRouteService = createConversationRouteService()
) {
  const route = new Hono<AppBindings>();

  route.get("/conversations", async (c) => {
    const conversations = await service.listConversations(c.get("userId"));
    return c.json(conversations);
  });

  route.post("/conversations", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return c.json({ error: "Conversation name is required" }, 400);
    }

    const conversation = await service.createConversation(c.get("userId"), name);
    return c.json(conversation, 201);
  });

  route.get("/conversations/search", async (c) => {
    const conversations = await service.searchConversations(c.get("userId"), c.req.query("q") ?? "");
    return c.json(conversations);
  });

  route.get("/conversations/:id/messages", async (c) => {
    const messages = await service.listMessages(c.get("userId"), c.req.param("id"));
    if (!messages) {
      return c.json({ error: "Conversation not found" }, 404);
    }
    return c.json(messages);
  });

  route.delete("/conversations/:id", async (c) => {
    const deleted = await service.deleteConversation(c.get("userId"), c.req.param("id"));
    if (!deleted) {
      return c.json({ error: "Conversation not found" }, 404);
    }
    return c.json({ ok: true });
  });

  return route;
}
