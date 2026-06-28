import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages
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

  async findOne(query: Partial<T>) {
    return (
      this.items.find((item) =>
        Object.entries(query).every(([key, value]) => String(item[key as keyof T]) === String(value))
      ) ?? null
    );
  }

  async deleteOne(query: Partial<T>) {
    const before = this.items.length;
    this.items = this.items.filter(
      (item) =>
        !Object.entries(query).every(([key, value]) => String(item[key as keyof T]) === String(value))
    );
    return { deletedCount: before - this.items.length };
  }

  async deleteMany(query: Partial<T>) {
    const before = this.items.length;
    this.items = this.items.filter(
      (item) =>
        !Object.entries(query).every(([key, value]) => String(item[key as keyof T]) === String(value))
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
