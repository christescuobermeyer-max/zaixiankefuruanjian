export type ApiConversation = {
  id: string;
  name: string;
  summary: string;
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  tokens: number;
  createdAt: string;
};

export type ApiShopStats = {
  shopCount: number;
  retentionDays: 60;
  deletedExpiredCount: number;
  shops: Array<{
    id: string;
    name: string;
    latestUpdatedAt: string;
  }>;
};

type Fetcher = typeof fetch;

export type AuthSession = {
  accessToken: string;
  email: string;
  displayName: string;
};

type SignInOptions = {
  supabaseUrl: string;
  anonKey: string;
  email: string;
  password: string;
  fetcher?: Fetcher;
};

type ApiClientOptions = {
  baseUrl?: string;
  getToken: () => string | null;
  fetcher?: Fetcher;
};

type StreamChatInput = {
  conversationId: string;
  message: string;
  onChunk: (chunk: string) => void;
};

export function getBackendUrl() {
  return trimTrailingSlash(import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8787");
}

export function getSupabaseConfig() {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ""
  };
}

export async function signInWithPassword(options: SignInOptions): Promise<AuthSession> {
  const supabaseUrl = trimTrailingSlash(options.supabaseUrl);
  if (!supabaseUrl || !options.anonKey) {
    throw new Error("Supabase login is not configured");
  }

  const res = await (options.fetcher ?? fetch)(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${options.anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email: options.email, password: options.password })
  });

  if (!res.ok) {
    throw new Error("邮箱或密码不正确");
  }

  const body = (await res.json()) as {
    access_token?: unknown;
    user?: {
      email?: unknown;
      user_metadata?: Record<string, unknown>;
    };
  };
  if (typeof body.access_token !== "string" || body.access_token.length === 0) {
    throw new Error("Supabase login response is missing access token");
  }
  const email = typeof body.user?.email === "string" ? body.user.email : options.email;
  return {
    accessToken: body.access_token,
    email,
    displayName: displayNameFromUser(body.user?.user_metadata, email)
  };
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = trimTrailingSlash(options.baseUrl ?? getBackendUrl());
  const fetcher = options.fetcher ?? fetch;

  async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetcher(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...authHeaders(options.getToken()),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers as Record<string, string> | undefined)
      }
    });

    if (!res.ok) {
      throw new Error(await readApiError(res));
    }
    return (await res.json()) as T;
  }

  return {
    listConversations: () => requestJson<ApiConversation[]>("/api/conversations"),
    createConversation: (name: string) =>
      requestJson<ApiConversation>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ name })
      }),
    searchConversations: (query: string) =>
      requestJson<ApiConversation[]>(`/api/conversations/search?q=${encodeURIComponent(query)}`),
    getConversationStats: () => requestJson<ApiShopStats>("/api/conversations/stats"),
    listMessages: (conversationId: string) =>
      requestJson<ApiMessage[]>(`/api/conversations/${encodeURIComponent(conversationId)}/messages`),
    deleteConversation: (conversationId: string) =>
      requestJson<{ ok: true }>(`/api/conversations/${encodeURIComponent(conversationId)}`, {
        method: "DELETE"
      }),
    streamChat: async (input: StreamChatInput) => {
      const res = await fetcher(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          ...authHeaders(options.getToken()),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ conversationId: input.conversationId, message: input.message })
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      return readSseStream(res, input.onChunk);
    }
  };
}

function authHeaders(token: string | null): Record<string, string> {
  if (!token) {
    throw new Error("Not authenticated");
  }
  return { Authorization: `Bearer ${token}` };
}

async function readApiError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body.error === "string") {
    return body.error;
  }
  return `Request failed with status ${res.status}`;
}

async function readSseStream(res: Response, onChunk: (chunk: string) => void) {
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    onChunk(text);
    return text;
  }

  const decoder = new TextDecoder();
  let pending = "";
  let answer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const parts = pending.split("\n\n");
    pending = parts.pop() ?? "";

    for (const part of parts) {
      const chunk = readSseData(part);
      if (!chunk || chunk === "[DONE]") continue;
      answer += chunk;
      onChunk(chunk);
    }
  }

  if (pending) {
    const chunk = readSseData(pending);
    if (chunk && chunk !== "[DONE]") {
      answer += chunk;
      onChunk(chunk);
    }
  }

  return answer;
}

function readSseData(eventBlock: string) {
  return eventBlock
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart())
    .join("\n");
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function displayNameFromUser(metadata: Record<string, unknown> | undefined, email: string) {
  const value =
    stringMetadata(metadata, "name") ??
    stringMetadata(metadata, "full_name") ??
    stringMetadata(metadata, "display_name") ??
    stringMetadata(metadata, "nickname");
  if (value) {
    return value;
  }
  return email.split("@")[0] || "账号";
}

function stringMetadata(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
