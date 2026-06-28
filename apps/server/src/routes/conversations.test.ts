import { SignJWT } from "jose";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { authMiddleware } from "../middleware/auth.js";
import { createConversationsRoute } from "./conversations.js";
import type { ConversationDto, MessageDto } from "../types/domain.js";

const secret = "test-secret-with-enough-length";

async function token(sub = "user-1") {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

function buildApp(service = fakeService()) {
  const app = new Hono();
  app.use("/api/*", authMiddleware({ jwtSecret: secret }));
  app.route("/api", createConversationsRoute(service));
  return app;
}

function fakeService() {
  return {
    createConversation: async (_userId: string, name: string): Promise<ConversationDto> => ({
      id: "conv-1",
      name,
      summary: "",
      tokenCount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }),
    listConversations: async (): Promise<ConversationDto[]> => [
      {
        id: "conv-1",
        name: "川味小厨",
        summary: "",
        tokenCount: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    listMessages: async (): Promise<MessageDto[] | null> => [
      {
        id: "msg-1",
        conversationId: "conv-1",
        role: "user" as const,
        content: "催单",
        tokens: 2,
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    deleteConversation: async (): Promise<boolean> => true
  };
}

describe("conversations routes", () => {
  it("creates a conversation for authenticated user", async () => {
    const app = buildApp();

    const res = await app.request("/api/conversations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await token()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: "川味小厨" })
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ name: "川味小厨" });
  });

  it("rejects empty conversation names", async () => {
    const app = buildApp();

    const res = await app.request("/api/conversations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await token()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: "  " })
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Conversation name is required" });
  });

  it("lists conversations and messages", async () => {
    const app = buildApp();
    const auth = { Authorization: `Bearer ${await token()}` };

    const listRes = await app.request("/api/conversations", { headers: auth });
    const messagesRes = await app.request("/api/conversations/conv-1/messages", { headers: auth });

    expect(listRes.status).toBe(200);
    expect(messagesRes.status).toBe(200);
    expect(await listRes.json()).toHaveLength(1);
    expect(await messagesRes.json()).toHaveLength(1);
  });

  it("returns 404 for missing conversation messages", async () => {
    const app = buildApp({ ...fakeService(), listMessages: async () => null });

    const res = await app.request("/api/conversations/missing/messages", {
      headers: { Authorization: `Bearer ${await token()}` }
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Conversation not found" });
  });
});
