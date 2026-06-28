import type { ObjectId } from "mongodb";

export type ConversationDocument = {
  _id: ObjectId;
  userId: string;
  name: string;
  summary: string;
  tokenCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageRole = "user" | "assistant";

export type MessageDocument = {
  _id: ObjectId;
  conversationId: ObjectId;
  userId: string;
  role: MessageRole;
  content: string;
  tokens: number;
  createdAt: Date;
};

export type ConversationDto = {
  id: string;
  name: string;
  summary: string;
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MessageDto = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokens: number;
  createdAt: string;
};
