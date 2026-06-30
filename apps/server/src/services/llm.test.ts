import { describe, expect, it } from "vitest";
import { buildCustomerServicePrompt } from "../prompts/customer-service.js";
import { createLlmConfig, normalizeReply } from "./llm.js";

describe("LLM service", () => {
  it("builds a customer-service system prompt with shop name", () => {
    const prompt = buildCustomerServicePrompt("川味小厨");

    expect(prompt).toContain("川味小厨");
    expect(prompt).toContain("外卖代运营客服");
  });

  it("creates config from environment values", () => {
    const config = createLlmConfig({
      LLM_BASE_URL: "https://yunwu.ai/v1",
      LLM_API_KEY: "test-key",
      LLM_MODEL: "gemini-3.1-flash-lite"
    });

    expect(config).toEqual({
      baseURL: "https://yunwu.ai/v1",
      apiKey: "test-key",
      model: "gemini-3.1-flash-lite"
    });
  });

  it("collapses multi-paragraph replies into a single continuous message", () => {
    const reply = normalizeReply("这个问题我们已经在看了。\n\n  \n后续做完会同步给您。");
    expect(reply).toBe("这个问题我们已经在看了。后续做完会同步给您。");
  });

  it("trims surrounding whitespace and keeps a single-line reply intact", () => {
    expect(normalizeReply("  单量后续会持续稳定递增的  ")).toBe("单量后续会持续稳定递增的");
  });

  it("strips a leading @mention and salutation", () => {
    expect(normalizeReply("@老板，单量后续会持续稳定递增的")).toBe("单量后续会持续稳定递增的");
    expect(normalizeReply("@张老板 这个我们已经在看了")).toBe("这个我们已经在看了");
    expect(normalizeReply("老板：曝光确实受算法影响")).toBe("曝光确实受算法影响");
  });

  it("does not strip an @ that is mid-sentence", () => {
    expect(normalizeReply("点金成本大概1-2块@一单")).toBe("点金成本大概1-2块@一单");
  });
});
