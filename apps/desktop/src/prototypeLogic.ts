import type { Conversation } from "./prototypeData";

export function filterConversations(conversations: Conversation[], query: string): Conversation[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) {
    return conversations;
  }
  return conversations.filter((conversation) => conversation.name.toLowerCase().includes(keyword));
}

export function createConversation(name: string): Conversation {
  const trimmed = name.trim();
  return {
    id: `c${Date.now()}`,
    name: trimmed,
    tag: "新建",
    time: "刚刚",
    streamed: false,
    pending: `您好，这里是「${trimmed}」在线客服，很高兴为您服务。请问有什么可以帮您？(订单 / 退款 / 催单 / 配送)`,
    messages: []
  };
}

export function replyFor(text: string, shop: string): string {
  if (/退款|退钱|退我|不要了/.test(text)) {
    return `好的，我来帮您处理「${shop}」这笔订单的退款。请确认退款原因：缺漏餐 / 商品质量 / 配送超时？\n确认后我将按平台流程发起，款项原路退回，预计 1-3 个工作日到账。`;
  }
  if (/催|多久|还要多久|什么时候|送达|配送|到哪|没送/.test(text)) {
    return "已为您催单并联系骑手～当前订单状态：已出餐，骑手距您约 1.5km，预计 10-15 分钟送达。\n已帮您标记「加急」，请您耐心稍候，有任何问题随时找我。";
  }
  if (/漏|少|缺|没给|没有|忘记/.test(text)) {
    return "非常抱歉造成缺漏！请提供订单号，我核实后为缺漏商品办理「补送」或「退款」（二选一由您决定），会尽快为您处理。";
  }
  if (/优惠|活动|券|便宜|满减/.test(text)) {
    return "本店当前活动：满 30 减 5、满 60 减 12；新客首单立减 8 元。\n另有「招牌菜第二份半价」，下单时系统会自动匹配最优优惠，无需手动输入～";
  }
  if (/推荐|吃什么|招牌|好吃|点什么/.test(text)) {
    return "为您推荐本店热销 Top3：回锅肉饭、麻婆豆腐盖饭、藤椒鸡丁饭；口味可备注「少辣 / 微辣」。\n需要我帮您整理一份下单清单吗？";
  }
  if (/谢谢|感谢|好的|可以|麻烦了|辛苦/.test(text)) {
    return "不客气，能帮到您是我的荣幸！还有其他需要随时找我，祝您用餐愉快～";
  }
  return `收到，已记录您的诉求：「${text}」。我会尽快为您核实处理；如涉及具体订单，麻烦提供订单号以便加速。请问还有什么可以帮您？`;
}

export function formatClock(date: Date): { time: string; date: string } {
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    date: `${date.getMonth() + 1}/${date.getDate()}`
  };
}
