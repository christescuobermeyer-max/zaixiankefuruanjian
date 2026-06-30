export type LlmConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
};

type EnvLike = Record<string, string | undefined>;

export function createLlmConfig(env: EnvLike = process.env): LlmConfig {
  const baseURL = env.LLM_BASE_URL ?? "https://yunwu.ai/v1";
  const apiKey = env.LLM_API_KEY;
  const model = env.LLM_MODEL ?? "gemini-3.1-flash-lite";

  if (!apiKey) {
    throw new Error("LLM_API_KEY is required");
  }

  return { baseURL, apiKey, model };
}

// 把模型回复折叠成单段：去掉换行和空行造成的分段，避免群里显示成假假的好几段。
export function normalizeReply(content: string): string {
  return content.replace(/[ \t]*\r?\n\s*/g, "").trim();
}

export async function completeWithLlm(input: {
  systemPrompt: string;
  summary: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
}): Promise<string> {
  const config = createLlmConfig();
  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: input.systemPrompt },
        ...(input.summary ? [{ role: "system", content: `历史摘要：${input.summary}` }] : []),
        ...input.history,
        { role: "user", content: input.message }
      ],
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error("LLM request failed");
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return normalizeReply(json.choices?.[0]?.message?.content ?? "");
}
