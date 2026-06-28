import { MongoClient, type Collection, type Db } from "mongodb";
import type { ConversationDocument, MessageDocument } from "../types/domain.js";

type MongoServiceOptions = {
  db?: Db;
  uri?: string;
  dbName?: string;
};

export type MongoService = {
  getDb(): Promise<Db>;
  conversations(): Collection<ConversationDocument>;
  messages(): Collection<MessageDocument>;
  ensureIndexes(): Promise<void>;
};

export function createMongoService(options: MongoServiceOptions = {}): MongoService {
  let client: MongoClient | null = null;
  let cachedDb = options.db ?? null;

  async function getDb(): Promise<Db> {
    if (cachedDb) {
      return cachedDb;
    }

    const uri = options.uri ?? process.env.MONGODB_URI;
    const dbName = options.dbName ?? process.env.MONGODB_DB ?? "zaixiankefu";
    if (!uri) {
      throw new Error("MONGODB_URI is required");
    }

    client = client ?? new MongoClient(uri);
    await client.connect();
    cachedDb = client.db(dbName);
    return cachedDb;
  }

  function getInjectedDb(): Db {
    if (!cachedDb) {
      throw new Error("MongoDB has not been initialized");
    }
    return cachedDb;
  }

  return {
    getDb,
    conversations() {
      return getInjectedDb().collection<ConversationDocument>("conversations");
    },
    messages() {
      return getInjectedDb().collection<MessageDocument>("messages");
    },
    async ensureIndexes() {
      const db = await getDb();
      await db.collection("conversations").createIndex({ userId: 1, updatedAt: -1 });
      await db.collection("messages").createIndex({ conversationId: 1, createdAt: 1 });
      await db.collection("messages").createIndex({ userId: 1, createdAt: -1 });
    }
  };
}

export const mongo = createMongoService();
