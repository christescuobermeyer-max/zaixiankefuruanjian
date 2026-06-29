import { describe, expect, it } from "vitest";
import { initialConversations } from "./prototypeData";
import { createConversation, filterConversations, replyFor } from "./prototypeLogic";

describe("prototype local logic", () => {
  it("filters conversations by shop name", () => {
    expect(filterConversations(initialConversations, "").map((item) => item.name)).toEqual([
      "川味小厨",
      "幸福麻辣烫",
      "老王烧烤"
    ]);
    expect(filterConversations(initialConversations, "川").map((item) => item.name)).toEqual(["川味小厨"]);
  });

  it("generates refund-oriented replies for refund requests", () => {
    const reply = replyFor("我想申请退款", "川味小厨");

    expect(reply).toContain("川味小厨");
    expect(reply).toContain("退款");
    expect(reply).toContain("1-3 个工作日到账");
  });

  it("creates a new conversation with a pending welcome reply", () => {
    const conversation = createConversation("新店");

    expect(conversation.name).toBe("新店");
    expect(conversation.tag).toBe("新建");
    expect(conversation.pending).toContain("新店");
    expect(conversation.messages).toEqual([]);
  });
});
