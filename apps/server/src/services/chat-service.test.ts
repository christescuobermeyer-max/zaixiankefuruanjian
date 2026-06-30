import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { createChatService } from "./chat-service.js";
import type { ConversationDocument, MessageDocument } from "../types/domain.js";

class MemoryCollection<T extends { _id: ObjectId }> {
  items: T[];

  constructor(items: T[] = []) {
    this.items = items;
  }

  async insertOne(doc: T) {
    this.items.push(doc);
    return { insertedId: doc._id };
  }

  async findOne(query: Partial<T>) {
    return (
      this.items.find((item) =>
        Object.entries(query).every(([key, value]) => String(item[key as keyof T]) === String(value))
      ) ?? null
    );
  }

  find(query: Partial<T>) {
    const matches = this.items.filter((item) =>
      Object.entries(query).every(([key, value]) => String(item[key as keyof T]) === String(value))
    );
    return {
      sort(sortSpec: Record<string, 1 | -1>) {
        const [[field, direction]] = Object.entries(sortSpec);
        const sorted = [...matches].sort((a, b) => {
          const av = a[field as keyof T] as Date;
          const bv = b[field as keyof T] as Date;
          return direction === 1 ? +av - +bv : +bv - +av;
        });
        return { toArray: async () => sorted };
      }
    };
  }

  async updateOne(query: Partial<T>, update: { $set: Partial<T>; $inc?: Partial<Record<keyof T, number>> }) {
    const item = await this.findOne(query);
    if (!item) {
      return { matchedCount: 0 };
    }
    Object.assign(item, update.$set);
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        item[key as keyof T] = ((item[key as keyof T] as number) + Number(value)) as T[keyof T];
      }
    }
    return { matchedCount: 1 };
  }
}

function buildStore(conversationId = new ObjectId()) {
  const conversations = new MemoryCollection<ConversationDocument>([
    {
      _id: conversationId,
      userId: "user-1",
      name: "川味小厨",
      summary: "",
      tokenCount: 0,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01")
    }
  ]);
  const messages = new MemoryCollection<MessageDocument>();
  return {
    conversationId,
    conversations,
    messages,
    store: {
      conversations: () => conversations as never,
      messages: () => messages as never
    }
  };
}

describe("chat service", () => {
  it("streams a response and persists user and assistant messages", async () => {
    const { store, conversationId, messages, conversations } = buildStore();
    const service = createChatService({
      store,
      streamCompletion: async () => "您好，已经帮您催促骑手。",
      summarize: async () => "summary"
    });

    const res = await service.streamChat({
      userId: "user-1",
      conversationId: conversationId.toHexString(),
      message: "帮我催单"
    });

    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(await res.text()).toContain("您好，已经帮您催促骑手。");
    expect(messages.items.map((item) => item.role)).toEqual(["user", "assistant"]);
    expect(messages.items.map((item) => item.content)).toEqual(["帮我催单", "您好，已经帮您催促骑手。"]);
    expect(conversations.items[0].tokenCount).toBeGreaterThan(0);
  });

  it("formats multiline assistant answers as valid SSE data lines", async () => {
    const { store, conversationId } = buildStore();
    const service = createChatService({
      store,
      streamCompletion: async () => "第一行\n第二行",
      summarize: async () => "summary"
    });

    const res = await service.streamChat({
      userId: "user-1",
      conversationId: conversationId.toHexString(),
      message: "帮我催单"
    });

    expect(await res.text()).toContain("data: 第一行\ndata: 第二行\n\n");
  });

  it("returns 404 when conversation does not belong to user", async () => {
    const { store, conversationId } = buildStore();
    const service = createChatService({
      store,
      streamCompletion: async () => "answer",
      summarize: async () => "summary"
    });

    const res = await service.streamChat({
      userId: "other-user",
      conversationId: conversationId.toHexString(),
      message: "hello"
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Conversation not found" });
  });
});
