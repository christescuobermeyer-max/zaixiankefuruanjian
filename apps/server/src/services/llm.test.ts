import { describe, expect, it } from "vitest";
import { buildCustomerServicePrompt } from "../prompts/customer-service.js";
import { createLlmConfig } from "./llm.js";

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
});
