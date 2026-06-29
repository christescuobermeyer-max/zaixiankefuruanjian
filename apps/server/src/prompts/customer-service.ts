import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const promptDir = join(dirname(fileURLToPath(import.meta.url)), "customer-service");

function loadKnowledgeBase(): string {
  const main = readFileSync(join(promptDir, "main.md"), "utf-8").trim();
  const knowledgeDir = join(promptDir, "knowledge");
  const files = readdirSync(knowledgeDir)
    .filter((file) => file.endsWith(".md"))
    .sort();
  const knowledge = files
    .map((file) => readFileSync(join(knowledgeDir, file), "utf-8").trim())
    .join("\n\n---\n\n");
  return `${main}\n\n---\n\n${knowledge}`;
}

// 启动时一次性加载并合并主文档与全部知识库子文档，避免每次请求读盘。
const knowledgeBase = loadKnowledgeBase();

export function buildCustomerServicePrompt(shopName: string): string {
  const name = shopName.trim() || "当前店铺";
  return `当前服务的店铺是「${name}」。\n\n${knowledgeBase}`;
}
