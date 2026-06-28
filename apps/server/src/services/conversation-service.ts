import { ObjectId, type Collection } from "mongodb";
import type {
  ConversationDocument,
  ConversationDto,
  MessageDocument,
  MessageDto
} from "../types/domain.js";

type ConversationStore = {
  conversations(): Collection<ConversationDocument>;
  messages(): Collection<MessageDocument>;
};

function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function createConversation(
  store: ConversationStore,
  userId: string,
  name: string
): Promise<ConversationDto> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Conversation name is required");
  }

  const now = new Date();
  const doc: ConversationDocument = {
    _id: new ObjectId(),
    userId,
    name: trimmedName,
    summary: "",
    tokenCount: 0,
    createdAt: now,
    updatedAt: now
  };
  await store.conversations().insertOne(doc);
  return toConversationDto(doc);
}

export async function listConversations(
  store: ConversationStore,
  userId: string
): Promise<ConversationDto[]> {
  const docs = await store.conversations().find({ userId }).sort({ updatedAt: -1 }).toArray();
  return docs.map(toConversationDto);
}

export async function searchConversations(
  store: ConversationStore,
  userId: string,
  query: string
): Promise<ConversationDto[]> {
  const keyword = query.trim();
  if (!keyword) {
    return [];
  }

  const docs = await store
    .conversations()
    .find({
      userId,
      name: { $regex: escapeRegex(keyword), $options: "i" }
    } as never)
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map(toConversationDto);
}

export async function listMessages(
  store: ConversationStore,
  userId: string,
  conversationId: string
): Promise<MessageDto[] | null> {
  const _id = toObjectId(conversationId);
  if (!_id) {
    return null;
  }

  const conversation = await store.conversations().findOne({ _id, userId });
  if (!conversation) {
    return null;
  }

  const docs = await store.messages().find({ conversationId: _id, userId }).sort({ createdAt: 1 }).toArray();
  return docs.map(toMessageDto);
}

export async function deleteConversation(
  store: ConversationStore,
  userId: string,
  conversationId: string
): Promise<boolean> {
  const _id = toObjectId(conversationId);
  if (!_id) {
    return false;
  }

  const result = await store.conversations().deleteOne({ _id, userId });
  if (result.deletedCount !== 1) {
    return false;
  }

  await store.messages().deleteMany({ conversationId: _id, userId });
  return true;
}

export function toConversationDto(doc: ConversationDocument): ConversationDto {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    summary: doc.summary,
    tokenCount: doc.tokenCount,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  };
}

export function toMessageDto(doc: MessageDocument): MessageDto {
  return {
    id: doc._id.toHexString(),
    conversationId: doc.conversationId.toHexString(),
    role: doc.role,
    content: doc.content,
    tokens: doc.tokens,
    createdAt: doc.createdAt.toISOString()
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
