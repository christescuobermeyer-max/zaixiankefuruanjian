import { cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// tsc 只编译 .ts，不会拷贝 .md 知识库文档。build 后把 prompt 文档复制到 dist。
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src", "prompts", "customer-service");
const dest = join(root, "dist", "prompts", "customer-service");

cpSync(src, dest, { recursive: true });
console.log(`Copied prompt knowledge base to ${dest}`);
