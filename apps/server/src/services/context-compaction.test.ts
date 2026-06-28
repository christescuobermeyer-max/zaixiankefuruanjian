import { describe, expect, it } from "vitest";
import {
  buildContextMessages,
  compactIfNeeded,
  estimateTokens,
  shouldCompact
} from "./context-compaction.js";

const history = [
  { role: "user" as const, content: "第一问" },
  { role: "assistant" as const, content: "第一答" },
  { role: "user" as const, content: "第二问" },
  { role: "assistant" as const, content: "第二答" },
  { role: "user" as const, content: "第三问" },
  { role: "assistant" as const, content: "第三答" }
];

describe("context compaction", () => {
  it("estimates tokens monotonically", () => {
    expect(estimateTokens("你好")).toBeGreaterThan(0);
    expect(estimateTokens("你好，外卖订单需要催单")).toBeGreaterThan(estimateTokens("你好"));
  });

  it("decides compaction at the configured limit", () => {
    expect(shouldCompact(8001, 8000)).toBe(true);
    expect(shouldCompact(8000, 8000)).toBe(false);
  });

  it("summarizes older messages and keeps recent rounds", async () => {
    const result = await compactIfNeeded({
      existingSummary: "",
      messages: history,
      totalTokens: 999,
      limit: 10,
      keepRecentRounds: 1,
      summarize: async (messagesToSummarize) =>
        `summary:${messagesToSummarize.map((item) => item.content).join("|")}`
    });

    expect(result.summary).toContain("第一问");
    expect(result.recentMessages.map((item) => item.content)).toEqual(["第三问", "第三答"]);
  });

  it("builds context in system, summary, recent and user order", () => {
    const messages = buildContextMessages({
      systemPrompt: "system",
      summary: "older summary",
      recentMessages: [{ role: "assistant", content: "recent answer" }],
      userInput: "new question"
    });

    expect(messages).toEqual([
      { role: "system", content: "system" },
      { role: "system", content: "历史摘要：older summary" },
      { role: "assistant", content: "recent answer" },
      { role: "user", content: "new question" }
    ]);
  });
});
