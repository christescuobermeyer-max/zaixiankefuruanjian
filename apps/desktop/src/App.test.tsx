import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const invokeMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

const apiConversations = [
  {
    id: "c1",
    name: "川味小厨",
    summary: "",
    tokenCount: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:01:00.000Z"
  },
  {
    id: "c2",
    name: "幸福麻辣烫",
    summary: "",
    tokenCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" }
  });
}

function sseResponse(body: string) {
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream" }
  });
}

function installFetchMock() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url === "https://supabase.test/auth/v1/token?grant_type=password") {
      return jsonResponse({
        access_token: "jwt-1",
        user: {
          email: "admin@example.com",
          user_metadata: {
            name: "王涛"
          }
        }
      });
    }
    if (url === "https://api.test/api/conversations" && method === "GET") {
      return jsonResponse(apiConversations);
    }
    if (url === "https://api.test/api/conversations" && method === "POST") {
      return jsonResponse(
        {
          id: "c3",
          name: "新店铺",
          summary: "",
          tokenCount: 0,
          createdAt: "2026-01-01T00:02:00.000Z",
          updatedAt: "2026-01-01T00:02:00.000Z"
        },
        { status: 201 }
      );
    }
    if (url === "https://api.test/api/conversations/search?q=%E5%B7%9D") {
      return jsonResponse([apiConversations[0]]);
    }
    if (url === "https://api.test/api/conversations/stats") {
      return jsonResponse({ shopCount: 2, retentionDays: 60, deletedExpiredCount: 0, shops: [] });
    }
    if (url === "https://api.test/api/conversations/c1/messages") {
      return jsonResponse([
        {
          id: "m1",
          conversationId: "c1",
          role: "user",
          content: "催单",
          tokens: 2,
          createdAt: "2026-01-01T00:01:00.000Z"
        }
      ]);
    }
    if (url === "https://api.test/api/conversations/c2/messages") {
      return jsonResponse([]);
    }
    if (url === "https://api.test/api/conversations/c2" && method === "DELETE") {
      return jsonResponse({ ok: true });
    }
    if (url === "https://api.test/api/chat" && method === "POST") {
      return sseResponse("data: 已为您催单并联系骑手\n\ndata: [DONE]\n\n");
    }

    return jsonResponse({ error: `Unhandled test request: ${method} ${url}` }, { status: 500 });
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("App prototype replica", () => {
  let fetchMock: ReturnType<typeof installFetchMock>;

  beforeEach(() => {
    invokeMock.mockClear();
    invokeMock.mockResolvedValue(undefined);
    vi.stubEnv("VITE_SUPABASE_URL", "https://supabase.test");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("VITE_BACKEND_URL", "https://api.test");
    fetchMock = installFetchMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("renders only the customer-service top entry without simulated desktop chrome", () => {
    const { container } = render(<App />);

    expect(container.querySelector(".desktop-wall")).not.toBeInTheDocument();
    expect(container.querySelector(".desktop-icons")).not.toBeInTheDocument();
    expect(container.querySelector(".taskbar")).not.toBeInTheDocument();
    expect(container.querySelector(".hotzone")).not.toBeInTheDocument();
    expect(container.querySelector(".prototype-root")).toHaveAttribute("data-accent", "green");
    expect(screen.getByRole("button", { name: /AI客服/ })).toBeInTheDocument();
  });

  it("asks Tauri to reveal the real desktop panel from the hidden pill", async () => {
    render(<App />);

    expect(screen.getByRole("button", { name: /AI客服/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));

    expect(invokeMock).toHaveBeenCalledWith("reveal_panel");
    expect(screen.getAllByText("外卖在线客服助手").length).toBeGreaterThan(0);
    expect(screen.getByText("登录后即可使用 AI 客服对话")).toBeInTheDocument();
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
  });

  it("reveals from hover only after a short intent delay", () => {
    vi.useFakeTimers();
    render(<App />);

    const pill = screen.getByRole("button", { name: /AI客服/ });
    fireEvent.mouseEnter(pill);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(invokeMock).not.toHaveBeenCalledWith("reveal_panel");
    expect(screen.queryByText("登录后即可使用 AI 客服对话")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(invokeMock).toHaveBeenCalledWith("reveal_panel");
    expect(screen.getByText("登录后即可使用 AI 客服对话")).toBeInTheDocument();
  });

  it("cancels hover reveal when the pointer leaves before the intent delay", () => {
    vi.useFakeTimers();
    render(<App />);

    const pill = screen.getByRole("button", { name: /AI客服/ });
    fireEvent.mouseEnter(pill);
    fireEvent.mouseLeave(pill);

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(invokeMock).not.toHaveBeenCalledWith("reveal_panel");
    expect(screen.queryByText("登录后即可使用 AI 客服对话")).not.toBeInTheDocument();
  });

  it("asks Tauri to shrink back to the top hidden button", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    await userEvent.click(screen.getByTitle("隐藏面板"));

    expect(invokeMock).toHaveBeenLastCalledWith("hide_panel");
    expect(screen.getByRole("button", { name: /AI客服/ })).toBeInTheDocument();
  });

  it("automatically shrinks when the pointer leaves the expanded panel", async () => {
    const { container } = render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    fireEvent.mouseLeave(container.querySelector(".panel-mover")!);

    expect(invokeMock).toHaveBeenLastCalledWith("hide_panel");
    expect(screen.getByRole("button", { name: /AI客服/ })).toBeInTheDocument();
  });

  it("keeps the panel open on pointer leave when pinned", async () => {
    const { container } = render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    await userEvent.click(screen.getByTitle("固定面板（禁用自动隐藏）"));
    invokeMock.mockClear();

    fireEvent.mouseLeave(container.querySelector(".panel-mover")!);

    expect(invokeMock).not.toHaveBeenCalledWith("hide_panel");
    expect(screen.queryByRole("button", { name: /AI客服/ })).not.toBeInTheDocument();
  });

  it("moves the hidden top button without opening the chat panel while dragging", () => {
    vi.useFakeTimers();
    render(<App />);

    const pill = screen.getByRole("button", { name: /AI客服/ });
    fireEvent.mouseEnter(pill);
    fireEvent.pointerDown(pill, { clientX: 80, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 130, pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(700);
    });

    fireEvent.pointerUp(window, { clientX: 130, pointerId: 1 });

    expect(invokeMock).toHaveBeenCalledWith("move_hidden_button", { deltaX: 50 });
    expect(invokeMock).not.toHaveBeenCalledWith("reveal_panel");
    expect(screen.queryByText("登录后即可使用 AI 客服对话")).not.toBeInTheDocument();
  });

  it("validates login and shows the authenticated chat layout", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    await userEvent.click(screen.getByRole("button", { name: "登 录" }));
    expect(screen.getByText("请输入密码")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("密码"), "demo-password");
    await userEvent.click(screen.getByRole("button", { name: "登 录" }));

    expect(await screen.findByRole("button", { name: /新建对话/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("https://supabase.test/auth/v1/token?grant_type=password", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/conversations", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/conversations/stats", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/conversations/c1/messages", expect.any(Object));
    expect(screen.getAllByText("川味小厨").length).toBeGreaterThan(0);
    expect(screen.getByText("王涛")).toBeInTheDocument();
    expect(screen.queryByText("xuxikai886")).not.toBeInTheDocument();
    expect(screen.getByText("王")).toBeInTheDocument();
    expect(screen.getByText("催单")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索会话名称...")).toBeInTheDocument();
  });

  it("shows remember-password and auto-login options checked by default", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));

    expect(screen.getByLabelText("记住密码")).toBeChecked();
    expect(screen.getByLabelText("自动登录")).toBeChecked();
  });

  it("remembers login credentials after a successful login when enabled", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    await userEvent.clear(screen.getByLabelText("邮箱"));
    await userEvent.type(screen.getByLabelText("邮箱"), "admin@example.com");
    await userEvent.type(screen.getByLabelText("密码"), "demo-password");
    await userEvent.click(screen.getByRole("button", { name: "登 录" }));

    await screen.findByRole("button", { name: /新建对话/ });
    expect(window.localStorage.getItem("zaixiankefu.loginPreferences")).toBe(
      JSON.stringify({
        email: "admin@example.com",
        password: "demo-password",
        rememberPassword: true,
        autoLogin: true
      })
    );
  });

  it("clears remembered credentials and disables auto-login when remember-password is unchecked", async () => {
    window.localStorage.setItem(
      "zaixiankefu.loginPreferences",
      JSON.stringify({
        email: "old@example.com",
        password: "old-password",
        rememberPassword: true,
        autoLogin: false
      })
    );
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    await userEvent.click(screen.getByLabelText("记住密码"));

    expect(screen.getByLabelText("记住密码")).not.toBeChecked();
    expect(screen.getByLabelText("自动登录")).not.toBeChecked();
    expect(window.localStorage.getItem("zaixiankefu.loginPreferences")).toBeNull();
  });

  it("automatically logs in when saved credentials allow it", async () => {
    window.localStorage.setItem(
      "zaixiankefu.loginPreferences",
      JSON.stringify({
        email: "admin@example.com",
        password: "demo-password",
        rememberPassword: true,
        autoLogin: true
      })
    );

    render(<App />);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://supabase.test/auth/v1/token?grant_type=password",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "admin@example.com", password: "demo-password" })
        })
      );
    });
    expect(screen.getByRole("button", { name: /AI客服/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));

    expect(await screen.findByRole("button", { name: /新建对话/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://supabase.test/auth/v1/token?grant_type=password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "admin@example.com", password: "demo-password" })
      })
    );
  });

  it("keeps the login screen visible when backend conversation loading fails", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    await userEvent.type(screen.getByLabelText("密码"), "demo-password");
    fetchMock.mockImplementationOnce(async () => jsonResponse({ access_token: "jwt-1" }));
    fetchMock.mockImplementationOnce(async () => jsonResponse({ error: "Failed to fetch conversations" }, { status: 500 }));

    await userEvent.click(screen.getByRole("button", { name: "登 录" }));

    expect(await screen.findByText("Failed to fetch conversations")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登 录" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /新建对话/ })).not.toBeInTheDocument();
  });

  it("searches conversations and opens the new conversation modal", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    await userEvent.type(screen.getByLabelText("密码"), "demo-password");
    await userEvent.click(screen.getByRole("button", { name: "登 录" }));
    await screen.findByRole("button", { name: /新建对话/ });

    await userEvent.type(screen.getByPlaceholderText("搜索会话名称..."), "川");
    expect(screen.getByText("搜索结果 · 1 个匹配")).toBeInTheDocument();
    expect(await screen.findByText(/更新于/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/conversations/search?q=%E5%B7%9D", expect.any(Object));

    await userEvent.click(screen.getByRole("button", { name: /新建对话/ }));
    expect(screen.getByText("开启新对话")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("建议直接填写店铺名，如「川味小厨」")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("建议直接填写店铺名，如「川味小厨」"), "新店铺");
    await userEvent.click(screen.getByRole("button", { name: "创建对话" }));
    expect((await screen.findAllByText("新店铺")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByPlaceholderText("搜索会话名称...")).toHaveValue("");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/conversations",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "新店铺" }) })
    );
  });

  it("shows a visible error when creating a conversation fails", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    await userEvent.type(screen.getByLabelText("密码"), "demo-password");
    await userEvent.click(screen.getByRole("button", { name: "登 录" }));
    await screen.findByText("催单");

    fetchMock.mockImplementationOnce(async () => jsonResponse({ error: "MongoDB connection failed" }, { status: 500 }));

    await userEvent.click(screen.getByRole("button", { name: /新建对话/ }));
    await userEvent.type(screen.getByPlaceholderText("建议直接填写店铺名，如「川味小厨」"), "新店铺");
    await userEvent.click(screen.getByRole("button", { name: "创建对话" }));

    expect(await screen.findByText("MongoDB connection failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建对话" })).not.toBeDisabled();
  });

  it("sends a message and streams an assistant reply", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    await userEvent.type(screen.getByLabelText("密码"), "demo-password");
    await userEvent.click(screen.getByRole("button", { name: "登 录" }));
    await screen.findByRole("button", { name: /新建对话/ });

    await userEvent.type(screen.getByPlaceholderText("输入消息，Enter 发送 / Shift+Enter 换行..."), "催一下单");
    await userEvent.click(screen.getByRole("button", { name: /发送/ }));

    expect(screen.getAllByText("催一下单").length).toBeGreaterThan(0);
    expect(await screen.findByText(/已为您催单并联系骑手/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer jwt-1" }),
        body: JSON.stringify({ conversationId: "c1", message: "催一下单" })
      })
    );
  });

  it("copies a message to the clipboard via the copy button", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    await userEvent.type(screen.getByLabelText("密码"), "demo-password");
    await userEvent.click(screen.getByRole("button", { name: "登 录" }));
    await screen.findByRole("button", { name: /新建对话/ });

    await userEvent.type(screen.getByPlaceholderText("输入消息，Enter 发送 / Shift+Enter 换行..."), "催一下单");
    await userEvent.click(screen.getByRole("button", { name: /发送/ }));
    await screen.findByText(/已为您催单并联系骑手/);

    const copyButtons = screen.getAllByRole("button", { name: "复制" });
    await userEvent.click(copyButtons[0]);

    expect(writeText).toHaveBeenCalled();
  });

  it("deletes a conversation through the backend API", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /AI客服/ }));
    await userEvent.type(screen.getByLabelText("密码"), "demo-password");
    await userEvent.click(screen.getByRole("button", { name: "登 录" }));
    await screen.findByText("幸福麻辣烫");

    await userEvent.click(screen.getByTitle("删除 幸福麻辣烫"));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/conversations/c2",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(screen.queryByText("幸福麻辣烫")).not.toBeInTheDocument();
  });
});
