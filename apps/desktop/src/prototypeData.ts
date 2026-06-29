export type MessageRole = "assistant" | "user" | "divider";

export type Message = {
  id: string;
  role: MessageRole;
  t?: string;
  text?: string;
};

export type Conversation = {
  id: string;
  name: string;
  tag: string;
  time: string;
  streamed: boolean;
  pending: string | null;
  messages: Message[];
};

export const initialConversations: Conversation[] = [
  {
    id: "c1",
    name: "川味小厨",
    tag: "缺漏餐",
    time: "刚刚",
    streamed: false,
    pending:
      "已查到订单 8821 0473（川味小厨 · 回锅肉饭 ×1、米饭 ×2），核实确为少送 1 份米饭，十分抱歉。\n为您提供两种处理方案：\n1. 缺漏餐退款：米饭 ¥3 原路退回，预计 1-3 个工作日到账；\n2. 就近补送：安排骑手约 20 分钟内送达。\n请问您更倾向哪一种呢？",
    messages: [
      { id: "c1d", role: "divider" },
      {
        id: "c1a1",
        role: "assistant",
        t: "14:21",
        text: "您好，这里是「川味小厨」在线客服，很高兴为您服务。请问有什么可以帮您？(订单 / 退款 / 催单)"
      },
      { id: "c1u1", role: "user", t: "14:22", text: "我刚才那单少了一份米饭" },
      {
        id: "c1a2",
        role: "assistant",
        t: "14:22",
        text: "非常抱歉给您带来不便！麻烦提供一下订单号，我帮您核实并按平台流程为缺漏的米饭办理补偿。"
      },
      { id: "c1u2", role: "user", t: "14:23", text: "订单号 8821 0473" }
    ]
  },
  {
    id: "c2",
    name: "幸福麻辣烫",
    tag: "催单",
    time: "12:31",
    streamed: false,
    pending:
      "非常抱歉让您久等！订单 7745 已出餐，骑手「李师傅」正在配送途中，距您约 1.2km，预计 12 分钟内送达。\n已为您标记「加急」，并附赠一张 ¥5 无门槛券作为补偿，请您留意接收～",
    messages: [
      { id: "c2a1", role: "assistant", t: "12:28", text: "您好，幸福麻辣烫在线客服为您服务，请问有什么可以帮您？" },
      { id: "c2u1", role: "user", t: "12:31", text: "我的单做好了吗？等了快一个小时了" }
    ]
  },
  {
    id: "c3",
    name: "老王烧烤",
    tag: "缺漏餐",
    time: "昨天",
    streamed: false,
    pending:
      "十分抱歉！经核实订单 6620「烤板筋 ×10」漏出，已为您登记缺漏。可选方案：\n1. 全额退「板筋」¥20，原路 1-3 个工作日到账；\n2. 立即补做并安排专人补送。\n请问您选择哪一种？",
    messages: [
      { id: "c3a1", role: "assistant", t: "昨天", text: "您好，老王烧烤在线客服，很高兴为您服务。" },
      { id: "c3u1", role: "user", t: "昨天", text: "烤串少了10串板筋" }
    ]
  }
];
