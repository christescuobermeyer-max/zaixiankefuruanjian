import { describe, expect, it } from "vitest";
import { createMongoService } from "./mongo.js";

class FakeCollection {
  indexes: unknown[] = [];

  async createIndex(index: unknown) {
    this.indexes.push(index);
    return "index-name";
  }
}

class FakeDb {
  collections = new Map<string, FakeCollection>();

  collection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new FakeCollection());
    }
    return this.collections.get(name);
  }
}

describe("createMongoService", () => {
  it("exposes conversations and messages collections", async () => {
    const db = new FakeDb();
    const mongo = createMongoService({ db: db as never });

    expect(mongo.conversations()).toBe(db.collection("conversations"));
    expect(mongo.messages()).toBe(db.collection("messages"));
  });

  it("creates required collection indexes", async () => {
    const db = new FakeDb();
    const mongo = createMongoService({ db: db as never });

    await mongo.ensureIndexes();

    expect(db.collection("conversations")?.indexes).toContainEqual({
      userId: 1,
      updatedAt: -1
    });
    expect(db.collection("messages")?.indexes).toContainEqual({
      conversationId: 1,
      createdAt: 1
    });
    expect(db.collection("messages")?.indexes).toContainEqual({
      userId: 1,
      createdAt: -1
    });
  });
});
