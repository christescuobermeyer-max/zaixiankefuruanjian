import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  getConversationStats,
  searchConversations
} from "./conversation-service.js";
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

  find(query: Record<string, unknown>) {
    const matches = this.items.filter((item) =>
      Object.entries(query).every(([key, value]) => matchesQueryValue(item[key as keyof T], value))
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

  async findOne(query: Record<string, unknown>) {
    return (
      this.items.find((item) =>
        Object.entries(query).every(([key, value]) => matchesQueryValue(item[key as keyof T], value))
      ) ?? null
    );
  }

  async deleteOne(query: Record<string, unknown>) {
    const before = this.items.length;
    this.items = this.items.filter(
      (item) =>
        !Object.entries(query).every(([key, value]) => matchesQueryValue(item[key as keyof T], value))
    );
    return { deletedCount: before - this.items.length };
  }

  async deleteMany(query: Record<string, unknown>) {
    const before = this.items.length;
    this.items = this.items.filter(
      (item) =>
        !Object.entries(query).every(([key, value]) => matchesQueryValue(item[key as keyof T], value))
    );
    return { deletedCount: before - this.items.length };
  }
}

function buildStore() {
  const conversations = new MemoryCollection<ConversationDocument>();
  const messages = new MemoryCollection<MessageDocument>();
  return {
    conversations,
    messages,
    store: {
      conversations: () => conversations as never,
      messages: () => messages as never
    }
  };
}

function matchesQueryValue(actual: unknown, expected: unknown): boolean {
  if (expected && typeof expected === "object" && "$regex" in expected) {
    const regexQuery = expected as { $regex: string; $options?: string };
    return new RegExp(regexQuery.$regex, regexQuery.$options).test(String(actual));
  }
  if (expected && typeof expected === "object" && "$lt" in expected) {
    const ltQuery = expected as { $lt: Date };
    return actual instanceof Date && actual < ltQuery.$lt;
  }
  if (expected && typeof expected === "object" && "$in" in expected) {
    const inQuery = expected as { $in: unknown[] };
    return inQuery.$in.some((item) => String(item) === String(actual));
  }
  return String(actual) === String(expected);
}

describe("conversation service", () => {
  it("creates a named conversation for the current user", async () => {
    const { store } = buildStore();

    const created = await createConversation(store, "user-1", "  川味小厨  ");

    expect(created.name).toBe("川味小厨");
    expect(created.summary).toBe("");
    expect(created.tokenCount).toBe(0);
  });

  it("lists only conversations for the current user newest first", async () => {
    const { conversations, store } = buildStore();
    conversations.items.push(
      doc("user-1", "old", new Date("2026-01-01")),
      doc("user-2", "other", new Date("2026-01-03")),
      doc("user-1", "new", new Date("2026-01-02"))
    );

    const list = await listConversations(store, "user-1");

    expect(list.map((item) => item.name)).toEqual(["new", "old"]);
  });

  it("searches current user's conversations by name newest first", async () => {
    const { conversations, store } = buildStore();
    conversations.items.push(
      doc("user-1", "川味小厨", new Date("2026-01-01")),
      doc("user-1", "川味烧烤", new Date("2026-01-03")),
      doc("user-1", "粤式茶餐厅", new Date("2026-01-04")),
      doc("user-2", "川味他人店", new Date("2026-01-05"))
    );

    const results = await searchConversations(store, "user-1", " 川味 ");

    expect(results.map((item) => item.name)).toEqual(["川味烧烤", "川味小厨"]);
  });

  it("returns an empty list for blank conversation search terms", async () => {
    const { conversations, store } = buildStore();
    conversations.items.push(doc("user-1", "川味小厨", new Date("2026-01-01")));

    const results = await searchConversations(store, "user-1", "   ");

    expect(results).toEqual([]);
  });

  it("counts current user's active shops and deletes conversations idle for more than 60 days", async () => {
    const { conversations, messages, store } = buildStore();
    const activeId = new ObjectId();
    const recentId = new ObjectId();
    const expiredId = new ObjectId();
    const otherExpiredId = new ObjectId();
    conversations.items.push(
      doc("user-1", "川味小厨", new Date("2026-06-20"), activeId),
      doc("user-1", "粤式茶餐厅", new Date("2026-05-15"), recentId),
      doc("user-1", "过期炸鸡店", new Date("2026-04-01"), expiredId),
      doc("user-2", "其他账户过期店", new Date("2026-04-01"), otherExpiredId)
    );
    messages.items.push(
      message("user-1", activeId, "user", "active", new Date("2026-06-20")),
      message("user-1", expiredId, "user", "expired", new Date("2026-04-01")),
      message("user-2", otherExpiredId, "user", "other", new Date("2026-04-01"))
    );

    const stats = await getConversationStats(store, "user-1", {
      now: new Date("2026-06-28T00:00:00.000Z"),
      retentionDays: 60
    });

    expect(stats).toEqual({
      shopCount: 2,
      retentionDays: 60,
      deletedExpiredCount: 1,
      shops: [
        {
          id: activeId.toHexString(),
          name: "川味小厨",
          latestUpdatedAt: "2026-06-20T00:00:00.000Z"
        },
        {
          id: recentId.toHexString(),
          name: "粤式茶餐厅",
          latestUpdatedAt: "2026-05-15T00:00:00.000Z"
        }
      ]
    });
    expect(conversations.items.map((item) => item.name)).toEqual([
      "川味小厨",
      "粤式茶餐厅",
      "其他账户过期店"
    ]);
    expect(messages.items.map((item) => item.content)).toEqual(["active", "other"]);
  });

  it("returns messages only when the conversation belongs to user", async () => {
    const { conversations, messages, store } = buildStore();
    const conversationId = new ObjectId();
    conversations.items.push(doc("user-1", "shop", new Date(), conversationId));
    messages.items.push(
      message("user-1", conversationId, "assistant", "second", new Date("2026-01-02")),
      message("user-1", conversationId, "user", "first", new Date("2026-01-01"))
    );

    const list = await listMessages(store, "user-1", conversationId.toHexString());
    const forbidden = await listMessages(store, "user-2", conversationId.toHexString());

    if (!list) {
      throw new Error("expected messages for owning user");
    }
    expect(list.map((item) => item.content)).toEqual(["first", "second"]);
    expect(forbidden).toBeNull();
  });

  it("deletes a conversation and its messages for the current user", async () => {
    const { conversations, messages, store } = buildStore();
    const conversationId = new ObjectId();
    conversations.items.push(doc("user-1", "shop", new Date(), conversationId));
    messages.items.push(message("user-1", conversationId, "user", "hello", new Date()));

    const deleted = await deleteConversation(store, "user-1", conversationId.toHexString());

    expect(deleted).toBe(true);
    expect(conversations.items).toHaveLength(0);
    expect(messages.items).toHaveLength(0);
  });
});

function doc(userId: string, name: string, updatedAt: Date, id = new ObjectId()): ConversationDocument {
  return {
    _id: id,
    userId,
    name,
    summary: "",
    tokenCount: 0,
    createdAt: updatedAt,
    updatedAt
  };
}

function message(
  userId: string,
  conversationId: ObjectId,
  role: "user" | "assistant",
  content: string,
  createdAt: Date
): MessageDocument {
  return {
    _id: new ObjectId(),
    conversationId,
    userId,
    role,
    content,
    tokens: 1,
    createdAt
  };
}
