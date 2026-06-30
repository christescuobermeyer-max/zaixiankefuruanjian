import { ObjectId, type Collection } from "mongodb";
import { buildCustomerServicePrompt } from "../prompts/customer-service.js";
import { estimateTokens } from "./context-compaction.js";
import type { ConversationDocument, MessageDocument } from "../types/domain.js";

type ChatStore = {
  conversations(): Collection<ConversationDocument>;
  messages(): Collection<MessageDocument>;
};

type ChatServiceOptions = {
  store: ChatStore;
  streamCompletion(input: {
    systemPrompt: string;
    summary: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    message: string;
  }): Promise<string>;
  summarize(messages: Array<{ role: "user" | "assistant"; content: string }>): Promise<string>;
};

type StreamChatInput = {
  userId: string;
  conversationId: string;
  message: string;
};

export function createChatService(options: ChatServiceOptions) {
  return {
    async streamChat(input: StreamChatInput): Promise<Response> {
      const conversationId = ObjectId.isValid(input.conversationId)
        ? new ObjectId(input.conversationId)
        : null;
      if (!conversationId) {
        return Response.json({ error: "Conversation not found" }, { status: 404 });
      }

      const conversation = await options.store
        .conversations()
        .findOne({ _id: conversationId, userId: input.userId });
      if (!conversation) {
        return Response.json({ error: "Conversation not found" }, { status: 404 });
      }

      const historyDocs = await options.store
        .messages()
        .find({ conversationId, userId: input.userId })
        .sort({ createdAt: 1 })
        .toArray();
      const history = historyDocs.map((doc) => ({ role: doc.role, content: doc.content }));
      const answer = await options.streamCompletion({
        systemPrompt: buildCustomerServicePrompt(conversation.name),
        summary: conversation.summary,
        history,
        message: input.message
      });

      const now = new Date();
      const userTokens = estimateTokens(input.message);
      const assistantTokens = estimateTokens(answer);
      await options.store.messages().insertOne({
        _id: new ObjectId(),
        conversationId,
        userId: input.userId,
        role: "user",
        content: input.message,
        tokens: userTokens,
        createdAt: now
      });
      await options.store.messages().insertOne({
        _id: new ObjectId(),
        conversationId,
        userId: input.userId,
        role: "assistant",
        content: answer,
        tokens: assistantTokens,
        createdAt: now
      });
      await options.store.conversations().updateOne(
        { _id: conversationId, userId: input.userId },
        {
          $set: { updatedAt: now },
          $inc: { tokenCount: userTokens + assistantTokens }
        }
      );

      return new Response(`${formatSseData(answer)}data: [DONE]\n\n`, {
        headers: { "Content-Type": "text/event-stream; charset=utf-8" }
      });
    }
  };
}

function formatSseData(value: string) {
  return `${value
    .split(/\r?\n/)
    .map((line) => `data: ${line}`)
    .join("\n")}\n\n`;
}
