import { describe, expect, it } from "vitest";
import { buildCustomerServicePrompt } from "./customer-service.js";

describe("buildCustomerServicePrompt", () => {
  it("injects the shop name", () => {
    expect(buildCustomerServicePrompt("川味小厨")).toContain("「川味小厨」");
  });

  it("falls back to a default shop name when blank", () => {
    expect(buildCustomerServicePrompt("   ")).toContain("「当前店铺」");
  });

  it("includes the main role document", () => {
    const prompt = buildCustomerServicePrompt("店");
    expect(prompt).toContain("外卖代运营客服");
    expect(prompt).toContain("数据与承诺边界");
  });

  it("merges the knowledge base sub-documents", () => {
    const prompt = buildCustomerServicePrompt("店");
    // 来自不同知识库子文档的标志性内容
    expect(prompt).toContain("评分系统还没点亮");
    expect(prompt).toContain("点金推广");
    expect(prompt).toContain("验证码");
    expect(prompt).toContain("解约");
  });

  it("returns a substantial merged prompt", () => {
    expect(buildCustomerServicePrompt("店").length).toBeGreaterThan(2000);
  });
});
