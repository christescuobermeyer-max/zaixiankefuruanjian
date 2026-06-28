export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

type CompactOptions = {
  existingSummary: string;
  messages: Array<Omit<ChatMessage, "role"> & { role: "user" | "assistant" }>;
  totalTokens: number;
  limit: number;
  keepRecentRounds: number;
  summarize(messages: Array<Omit<ChatMessage, "role"> & { role: "user" | "assistant" }>): Promise<string>;
};

export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.max(1, Math.ceil(text.length / 1.6));
}

export function shouldCompact(totalTokens: number, limit: number): boolean {
  return totalTokens > limit;
}

export async function compactIfNeeded(options: CompactOptions) {
  const keepCount = Math.max(0, options.keepRecentRounds * 2);
  const recentMessages = keepCount > 0 ? options.messages.slice(-keepCount) : [];
  const olderMessages = keepCount > 0 ? options.messages.slice(0, -keepCount) : options.messages;

  if (!shouldCompact(options.totalTokens, options.limit) || olderMessages.length === 0) {
    return {
      summary: options.existingSummary,
      recentMessages: options.messages
    };
  }

  const summary = await options.summarize(olderMessages);
  return {
    summary,
    recentMessages
  };
}

export function buildContextMessages(options: {
  systemPrompt: string;
  summary: string;
  recentMessages: Array<Omit<ChatMessage, "role"> & { role: "user" | "assistant" }>;
  userInput: string;
}): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: options.systemPrompt }];

  if (options.summary.trim()) {
    messages.push({ role: "system", content: `历史摘要：${options.summary.trim()}` });
  }

  messages.push(...options.recentMessages);
  messages.push({ role: "user", content: options.userInput });
  return messages;
}
