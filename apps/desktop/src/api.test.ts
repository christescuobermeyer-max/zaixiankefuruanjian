import { describe, expect, it, vi } from "vitest";
import { createApiClient, signInWithPassword } from "./api";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...Object.fromEntries(new Headers(init.headers)) }
  });
}

describe("desktop api client", () => {
  it("signs in with Supabase password auth and returns the access token", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        access_token: "jwt-1",
        user: {
          email: "admin@example.com",
          user_metadata: { name: "王涛" }
        }
      })
    );

    const session = await signInWithPassword({
      supabaseUrl: "https://example.supabase.co",
      anonKey: "anon-key",
      email: "user@example.com",
      password: "secret",
      fetcher
    });

    expect(session).toEqual({
      accessToken: "jwt-1",
      email: "admin@example.com",
      displayName: "王涛"
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/token?grant_type=password",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "anon-key",
          Authorization: "Bearer anon-key",
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({ email: "user@example.com", password: "secret" })
      })
    );
  });

  it("falls back to the email prefix when Supabase user metadata has no display name", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        access_token: "jwt-1",
        user: { email: "admin@example.com", user_metadata: {} }
      })
    );

    const session = await signInWithPassword({
      supabaseUrl: "https://example.supabase.co",
      anonKey: "anon-key",
      email: "admin@example.com",
      password: "secret",
      fetcher
    });

    expect(session.displayName).toBe("admin");
  });

  it("calls every conversation API with bearer auth", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/conversations")) {
        return jsonResponse([{ id: "c1", name: "川味小厨", summary: "", tokenCount: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }]);
      }
      if (url.includes("/api/conversations/search")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/conversations/stats")) {
        return jsonResponse({ shopCount: 1, retentionDays: 60, deletedExpiredCount: 0, shops: [] });
      }
      if (url.endsWith("/api/conversations/c1/messages")) {
        return jsonResponse([{ id: "m1", conversationId: "c1", role: "user", content: "催单", tokens: 2, createdAt: "2026-01-01T00:00:00.000Z" }]);
      }
      return jsonResponse({ id: "c2", name: "新店", summary: "", tokenCount: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }, { status: 201 });
    });
    const api = createApiClient({ baseUrl: "https://api.example.com", getToken: () => "jwt-1", fetcher });

    await api.listConversations();
    await api.createConversation("新店");
    await api.searchConversations("川味");
    await api.getConversationStats();
    await api.listMessages("c1");
    await api.deleteConversation("c1");

    const calls = fetcher.mock.calls.map(([url, init]) => ({ url: String(url), init: init as RequestInit }));
    expect(calls.map((call) => call.url)).toEqual([
      "https://api.example.com/api/conversations",
      "https://api.example.com/api/conversations",
      "https://api.example.com/api/conversations/search?q=%E5%B7%9D%E5%91%B3",
      "https://api.example.com/api/conversations/stats",
      "https://api.example.com/api/conversations/c1/messages",
      "https://api.example.com/api/conversations/c1"
    ]);
    expect(calls.every((call) => (call.init.headers as Record<string, string>).Authorization === "Bearer jwt-1")).toBe(true);
    expect(calls[1].init.method).toBe("POST");
    expect(calls[5].init.method).toBe("DELETE");
  });

  it("streams chat chunks and ignores the done marker", async () => {
    const fetcher = vi.fn(async () =>
      new Response("data: 你好\n\ndata: ，已为您催单\n\ndata: [DONE]\n\n", {
        headers: { "Content-Type": "text/event-stream" }
      })
    );
    const api = createApiClient({ baseUrl: "https://api.example.com/", getToken: () => "jwt-1", fetcher });
    const chunks: string[] = [];

    const answer = await api.streamChat({
      conversationId: "c1",
      message: "催一下单",
      onChunk: (chunk) => chunks.push(chunk)
    });

    expect(answer).toBe("你好，已为您催单");
    expect(chunks).toEqual(["你好", "，已为您催单"]);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer jwt-1" }),
        body: JSON.stringify({ conversationId: "c1", message: "催一下单" })
      })
    );
  });
});
