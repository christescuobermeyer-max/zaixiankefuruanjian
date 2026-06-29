import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  createApiClient,
  getSupabaseConfig,
  signInWithPassword,
  type AuthSession,
  type ApiConversation,
  type ApiMessage,
  type ApiShopStats
} from "./api";
import { ChatIcon, CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, MinusIcon, PinIcon, SearchIcon, SendIcon, TrashIcon } from "./icons";
import { clearLoginPreferences, loadLoginPreferences, saveLoginPreferences } from "./authPreferences";
import { copyToClipboard } from "./clipboard";
import { checkAndInstallUpdate, type UpdateStatus } from "./updater";
import { type Conversation, type Message } from "./prototypeData";
import { filterConversations, formatClock } from "./prototypeLogic";

const HOVER_REVEAL_DELAY_MS = 520;
const DRAG_REVEAL_SUPPRESS_MS = 260;

type StreamingReply = {
  conversationId: string;
  text: string;
  t: string;
};

function LoginView(props: {
  email: string;
  password: string;
  showPassword: boolean;
  loginErr: string;
  loggingIn: boolean;
  rememberPassword: boolean;
  autoLogin: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setShowPassword: (value: boolean) => void;
  setRememberPassword: (value: boolean) => void;
  setAutoLogin: (value: boolean) => void;
  login: () => void;
}) {
  return (
    <div className="login-view">
      <div className="login-card">
        <div className="login-logo">
          <ChatIcon width="28" height="28" strokeWidth="1.8" />
        </div>
        <h1>外卖在线客服助手</h1>
        <p>登录后即可使用 AI 客服对话</p>

        <label className="field-label" htmlFor="email">
          邮箱
        </label>
        <input
          id="email"
          value={props.email}
          onChange={(event) => props.setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") props.login();
          }}
          placeholder="you@example.com"
        />

        <label className="field-label" htmlFor="password">
          密码
        </label>
        <div className="password-field">
          <input
            id="password"
            value={props.password}
            type={props.showPassword ? "text" : "password"}
            onChange={(event) => props.setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") props.login();
            }}
            placeholder="请输入密码"
          />
          <button type="button" title="显示 / 隐藏密码" onClick={() => props.setShowPassword(!props.showPassword)}>
            {props.showPassword ? <EyeOffIcon width="17" height="17" strokeWidth="1.7" /> : <EyeIcon width="17" height="17" strokeWidth="1.7" />}
          </button>
        </div>

        <div className="login-options">
          <label>
            <input
              type="checkbox"
              checked={props.rememberPassword}
              onChange={(event) => props.setRememberPassword(event.target.checked)}
            />
            <span>记住密码</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={props.autoLogin}
              disabled={!props.rememberPassword}
              onChange={(event) => props.setAutoLogin(event.target.checked)}
            />
            <span>自动登录</span>
          </label>
        </div>

        {props.loginErr && <div className="login-error">{props.loginErr}</div>}

        <button className="login-button" disabled={props.loggingIn} onClick={props.login}>
          {props.loggingIn ? (
            <>
              <span className="loading-dot" />
              登录中...
            </>
          ) : (
            "登 录"
          )}
        </button>
        <div className="login-note">呈尚策划运营部</div>
      </div>
    </div>
  );
}

function Sidebar(props: {
  conversations: Conversation[];
  stats: ApiShopStats | null;
  account: AuthSession | null;
  activeId: string | null;
  search: string;
  searching: boolean;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onLogout: () => void;
}) {
  const searchTrim = props.search.trim();
  const searchMode = searchTrim.length > 0;
  const matched = filterConversations(props.conversations, props.search);
  const visibleConversations = searchMode ? matched : props.conversations.slice(0, 30);
  const listLabel = searchMode
    ? `搜索结果 · ${matched.length} 个匹配`
    : props.stats
      ? `对话 · ${props.stats.shopCount} 个店铺`
      : "对话 · 按店铺名区分";

  return (
    <aside className="sidebar">
      <div className="new-conv-wrap">
        <button className="new-conv" onClick={props.onNew}>
          <span>+</span>
          新建对话
        </button>
      </div>
      <div className="search-wrap">
        <SearchIcon className="search-leading" width="15" height="15" strokeWidth="1.9" />
        <input value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="搜索会话名称..." />
        {searchMode && (
          <button title="清空搜索" onClick={props.onClearSearch}>
            ×
          </button>
        )}
      </div>
      <div className="list-label">{listLabel}</div>
      <div className="conversation-list" data-scroll="1">
        {searchMode && props.searching && <div className="searching">搜索中...</div>}
        {searchMode && !props.searching && visibleConversations.length === 0 && <div className="empty-search">未找到包含「{searchTrim}」的会话</div>}
        {(!searchMode || !props.searching) &&
          visibleConversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`conversation-row ${conversation.id === props.activeId ? "conversation-row-active" : ""}`}
              onClick={() => props.onSelect(conversation.id)}
            >
              <span className="active-bar" />
              <span className="conversation-main">
                <strong>{conversation.name}</strong>
                <small>
                  {searchMode ? `更新于 ${conversation.time}` : `${conversation.tag} · ${conversation.time}`}
                </small>
              </span>
              {conversation.id !== props.activeId && !searchMode && (
                <span
                  role="button"
                  tabIndex={0}
                  className="delete-conv"
                  title={`删除 ${conversation.name}`}
                  aria-label={`删除 ${conversation.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onDelete(conversation.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.stopPropagation();
                      props.onDelete(conversation.id);
                    }
                  }}
                >
                  <TrashIcon width="14" height="14" strokeWidth="1.8" />
                </span>
              )}
            </button>
          ))}
      </div>
      <div className="account-row">
        <div className="avatar">{accountInitial(props.account?.displayName)}</div>
        <div>
          <strong>{props.account?.displayName ?? "账号"}</strong>
          <button onClick={props.onLogout}>退出登录</button>
        </div>
      </div>
    </aside>
  );
}

function accountInitial(displayName: string | undefined) {
  const trimmed = displayName?.trim();
  return trimmed ? Array.from(trimmed)[0] : "账";
}

function ChatArea(props: {
  conversation: Conversation | null;
  streaming: StreamingReply | null;
  input: string;
  setInput: (value: string) => void;
  onSend: (forced?: string) => void;
}) {
  if (!props.conversation) {
    return (
      <main className="chat-main">
        <div className="no-conversation">还没有对话，点击左上角「新建对话」开始</div>
      </main>
    );
  }

  const compacted = props.conversation.messages.some((message) => message.role === "divider");

  return (
    <main className="chat-main">
      <header className="chat-header">
        <div>
          <div className="chat-title">
            {props.conversation.name}
            {compacted && <span>上下文较长，将自动压缩</span>}
          </div>
          <p>已接入 gemini-3.1-flash-lite · 累计上下文超 8K 自动摘要压缩</p>
        </div>
      </header>

      <div className="message-list" data-scroll="1">
        {props.conversation.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {props.streaming && (
          <div className="message message-assistant message-streaming" aria-live="polite">
            <div className="message-bubble">
              {props.streaming.text || "正在生成回复"}
              <span className="streaming-caret" />
            </div>
            <small>{props.streaming.t}</small>
          </div>
        )}
        {props.conversation.messages.length === 0 && <div className="empty-chat">开启新对话，开始与客服 AI 协作</div>}
      </div>

      <footer className="composer">
        <div className="composer-row">
          <textarea
            rows={1}
            value={props.input}
            onChange={(event) => props.setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                props.onSend();
              }
            }}
            placeholder="输入消息，Enter 发送 / Shift+Enter 换行..."
          />
          <button disabled={!props.input.trim()} onClick={() => props.onSend()}>
            <SendIcon width="16" height="16" strokeWidth="1.9" />
            发送
          </button>
        </div>
      </footer>
    </main>
  );
}

function updateBannerText(status: UpdateStatus | null): string | null {
  if (!status) {
    return null;
  }
  switch (status.state) {
    case "available":
      return `发现新版本 ${status.version}，正在准备下载...`;
    case "downloading": {
      if (status.total) {
        const percent = Math.min(100, Math.round((status.downloaded / status.total) * 100));
        return `正在下载更新 ${percent}%`;
      }
      return "正在下载更新...";
    }
    case "installing":
      return "正在安装更新，安装完成后将自动重启...";
    case "error":
      return `检查更新失败：${status.message}`;
    default:
      return null;
  }
}

function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);

  if (message.role === "divider") {
    return (
      <div className="message-divider">
        <span />
        较早对话已自动摘要压缩
        <span />
      </div>
    );
  }

  const onCopy = async () => {
    const ok = await copyToClipboard(message.text ?? "");
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={`message message-${message.role}`}>
      <div className="message-bubble">{message.text}</div>
      <div className="message-footer">
        <button
          type="button"
          className={`copy-btn ${copied ? "copy-btn-copied" : ""}`}
          title={copied ? "已复制" : "复制"}
          aria-label={copied ? "已复制" : "复制"}
          onClick={onCopy}
        >
          {copied ? (
            <CheckIcon width="14" height="14" strokeWidth="2" />
          ) : (
            <CopyIcon width="14" height="14" strokeWidth="2" />
          )}
        </button>
        <small>{message.t}</small>
      </div>
    </div>
  );
}

function NewConversationModal(props: {
  value: string;
  setValue: (value: string) => void;
  error: string;
  creating: boolean;
  onCreate: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-title">
          <strong>开启新对话</strong>
          <button onClick={props.onClose}>×</button>
        </div>
        <label htmlFor="new-conversation">对话名称</label>
        <input
          id="new-conversation"
          value={props.value}
          onChange={(event) => props.setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") props.onCreate();
          }}
          placeholder="建议直接填写店铺名，如「川味小厨」"
        />
        {props.error && <div className="modal-error">{props.error}</div>}
        <p>名称用于区分不同店铺的上下文，便于检索与持久化。</p>
        <div className="modal-actions">
          <button disabled={props.creating} onClick={props.onClose}>取消</button>
          <button disabled={props.creating || !props.value.trim()} onClick={props.onCreate}>
            {props.creating ? "创建中..." : "创建对话"}
          </button>
        </div>
      </div>
    </div>
  );
}

function fromApiConversation(conversation: ApiConversation): Conversation {
  return {
    id: conversation.id,
    name: conversation.name,
    tag: conversation.summary ? "已摘要" : "对话",
    time: formatApiTime(conversation.updatedAt),
    streamed: conversation.tokenCount > 0,
    pending: null,
    messages: []
  };
}

function fromApiMessage(message: ApiMessage): Message {
  return {
    id: message.id,
    role: message.role,
    t: formatApiTime(message.createdAt),
    text: message.content
  };
}

function createLocalConversation(name: string): Conversation {
  return {
    id: `local-${Date.now()}`,
    name,
    tag: "新建",
    time: "刚刚",
    streamed: false,
    pending: null,
    messages: []
  };
}

function formatApiTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }
  return formatClock(date).time;
}

export default function App() {
  const [panel, setPanel] = useState<"hidden" | "revealed">("hidden");
  const [pinned, setPinned] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [account, setAccount] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState("xuxikai886@kefu.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPasswordState] = useState(true);
  const [autoLogin, setAutoLogin] = useState(true);
  const [loginErr, setLoginErr] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stats, setStats] = useState<ApiShopStats | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [input, setInput] = useState("");
  const [modal, setModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newConversationErr, setNewConversationErr] = useState("");
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [streaming, setStreaming] = useState<StreamingReply | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const updateCheckStarted = useRef(false);
  const streamingTimer = useRef<number | null>(null);
  const hoverRevealTimer = useRef<number | null>(null);
  const dragStartX = useRef<number | null>(null);
  const dragDeltaX = useRef(0);
  const movedHiddenButton = useRef(false);
  const autoLoginStarted = useRef(false);
  const isRevealed = panel === "revealed";

  useEffect(() => {
    const preferences = loadLoginPreferences();
    if (preferences.email) {
      setEmail(preferences.email);
    }
    if (preferences.password) {
      setPassword(preferences.password);
    }
    setRememberPasswordState(preferences.rememberPassword);
    setAutoLogin(preferences.autoLogin);

    if (!autoLoginStarted.current && preferences.autoLogin && preferences.email.trim() && preferences.password.trim()) {
      autoLoginStarted.current = true;
      void login({
        email: preferences.email,
        password: preferences.password,
        rememberPassword: preferences.rememberPassword,
        autoLogin: preferences.autoLogin
      });
    }

    window.addEventListener("pointermove", moveHiddenButton);
    window.addEventListener("pointerup", endHiddenButtonMove);

    return () => {
      window.removeEventListener("pointermove", moveHiddenButton);
      window.removeEventListener("pointerup", endHiddenButtonMove);
      if (streamingTimer.current !== null) {
        window.clearInterval(streamingTimer.current);
      }
      clearHoverRevealTimer();
    };
  }, []);

  useEffect(() => {
    if (updateCheckStarted.current) {
      return;
    }
    updateCheckStarted.current = true;
    void checkAndInstallUpdate(setUpdateStatus);
  }, []);

  const pillLabel = useMemo(() => (isRevealed ? "AI客服已展开" : "AI客服"), [isRevealed]);
  const activeConversation = conversations.find((conversation) => conversation.id === activeId) ?? null;

  function clearHoverRevealTimer() {
    if (hoverRevealTimer.current !== null) {
      window.clearTimeout(hoverRevealTimer.current);
      hoverRevealTimer.current = null;
    }
  }

  function revealNow() {
    clearHoverRevealTimer();
    if (movedHiddenButton.current) {
      return;
    }
    setPanel("revealed");
    void invoke("reveal_panel").catch(() => undefined);
  }

  function hideNow() {
    clearHoverRevealTimer();
    setPanel("hidden");
    setPinned(false);
    void invoke("hide_panel").catch(() => undefined);
  }

  function beginHoverReveal() {
    if (movedHiddenButton.current || dragStartX.current !== null || hoverRevealTimer.current !== null) {
      return;
    }

    hoverRevealTimer.current = window.setTimeout(() => {
      hoverRevealTimer.current = null;
      revealNow();
    }, HOVER_REVEAL_DELAY_MS);
  }

  function beginHiddenButtonMove(event: React.PointerEvent<HTMLButtonElement>) {
    clearHoverRevealTimer();
    dragStartX.current = event.clientX;
    dragDeltaX.current = 0;
    movedHiddenButton.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveHiddenButton(event: PointerEvent) {
    if (dragStartX.current === null) return;
    dragDeltaX.current = event.clientX - dragStartX.current;
    if (Math.abs(dragDeltaX.current) >= 4) {
      movedHiddenButton.current = true;
    }
  }

  function endHiddenButtonMove() {
    if (dragStartX.current === null) return;
    const deltaX = dragDeltaX.current;
    dragStartX.current = null;
    dragDeltaX.current = 0;

    if (Math.abs(deltaX) >= 4) {
      void invoke("move_hidden_button", { deltaX }).catch(() => undefined);
      window.setTimeout(() => {
        movedHiddenButton.current = false;
      }, DRAG_REVEAL_SUPPRESS_MS);
      return;
    }

    movedHiddenButton.current = false;
  }

  function apiForToken(token = authToken) {
    return createApiClient({ getToken: () => token });
  }

  async function loadMessages(conversationId: string, token = authToken) {
    if (!token) return;
    const messages = await apiForToken(token).listMessages(conversationId);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, messages: messages.map(fromApiMessage) } : conversation
      )
    );
  }

  async function loadConversations(token: string) {
    const client = apiForToken(token);
    const [apiConversations, apiStats] = await Promise.all([
      client.listConversations(),
      client.getConversationStats()
    ]);
    const nextConversations = apiConversations.map(fromApiConversation);
    const nextActiveId = nextConversations[0]?.id ?? null;

    setStats(apiStats);
    setConversations(nextConversations);
    setActiveId(nextActiveId);

    if (nextActiveId) {
      await loadMessages(nextActiveId, token);
    }
  }

  function setRememberPassword(value: boolean) {
    setRememberPasswordState(value);
    if (!value) {
      setAutoLogin(false);
      clearLoginPreferences();
    }
  }

  async function login(override?: {
    email: string;
    password: string;
    rememberPassword: boolean;
    autoLogin: boolean;
  }) {
    const loginEmail = override?.email ?? email;
    const loginPassword = override?.password ?? password;
    const shouldRememberPassword = override?.rememberPassword ?? rememberPassword;
    const shouldAutoLogin = override?.autoLogin ?? autoLogin;

    if (!loginEmail.trim()) {
      setLoginErr("请输入邮箱");
      return;
    }
    if (!loginPassword.trim()) {
      setLoginErr("请输入密码");
      return;
    }
    setLoginErr("");
    setLoggingIn(true);
    try {
      const session = await signInWithPassword({
        ...getSupabaseConfig(),
        email: loginEmail.trim(),
        password: loginPassword
      });
      await loadConversations(session.accessToken);
      saveLoginPreferences({
        email: loginEmail.trim(),
        password: loginPassword,
        rememberPassword: shouldRememberPassword,
        autoLogin: shouldAutoLogin
      });
      setAuthToken(session.accessToken);
      setAccount(session);
      setAuthed(true);
      setLoggingIn(false);
    } catch (error) {
      setLoggingIn(false);
      setLoginErr(error instanceof Error ? error.message : "登录失败，请稍后重试");
    }
  }

  async function onSearch(value: string) {
    setSearch(value);
    const keyword = value.trim();
    if (!authToken) return;

    setSearching(keyword.length > 0);
    try {
      const apiConversations = keyword
        ? await apiForToken().searchConversations(keyword)
        : await apiForToken().listConversations();
      const nextConversations = apiConversations.map(fromApiConversation);
      const nextActiveId = nextConversations[0]?.id ?? null;

      setConversations(nextConversations);
      setActiveId(nextActiveId);
      if (nextActiveId) {
        await loadMessages(nextActiveId);
      }
    } finally {
      setSearching(false);
    }
  }

  async function deleteConversation(id: string) {
    if (authToken) {
      await apiForToken().deleteConversation(id);
    }
    setConversations((current) => {
      const next = current.filter((conversation) => conversation.id !== id);
      if (activeId === id) {
        setActiveId(next[0]?.id ?? null);
      }
      return next;
    });
  }

  async function onCreateConversation() {
    const name = newName.trim();
    if (!name) return;
    setNewConversationErr("");
    setCreatingConversation(true);
    try {
      const conversation = authToken
        ? fromApiConversation(await apiForToken().createConversation(name))
        : createLocalConversation(name);
      setConversations((current) => [conversation, ...current]);
      setActiveId(conversation.id);
      setSearch("");
      setSearching(false);
      setStats((current) =>
        current
          ? {
              ...current,
              shopCount: current.shopCount + 1,
              shops: [
                {
                  id: conversation.id,
                  name: conversation.name,
                  latestUpdatedAt: new Date().toISOString()
                },
                ...current.shops
              ]
            }
          : current
      );
      setModal(false);
      setNewName("");
    } catch (error) {
      setNewConversationErr(error instanceof Error ? error.message : "创建对话失败，请稍后重试");
    } finally {
      setCreatingConversation(false);
    }
  }

  async function sendMessage(forced?: string) {
    const text = (forced ?? input).trim();
    if (!text || !activeConversation || !authToken) return;
    const now = formatClock(new Date()).time;
    const conversationId = activeConversation.id;
    const userMessage: Message = { id: `u${Date.now()}`, role: "user", t: now, text };
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, time: "刚刚", messages: [...conversation.messages, userMessage] }
          : conversation
      )
    );
    setInput("");

    if (streamingTimer.current !== null) {
      window.clearInterval(streamingTimer.current);
    }

    setStreaming({ conversationId, text: "", t: now });

    try {
      const reply = await apiForToken().streamChat({
        conversationId,
        message: text,
        onChunk: (chunk) => {
          setStreaming((current) =>
            current?.conversationId === conversationId
              ? { ...current, text: `${current.text}${chunk}` }
              : current
          );
        }
      });

      const assistantMessage: Message = { id: `a${Date.now()}`, role: "assistant", t: now, text: reply };
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, time: "刚刚", streamed: true, messages: [...conversation.messages, assistantMessage] }
            : conversation
        )
      );
    } catch {
      const assistantMessage: Message = {
        id: `a${Date.now()}`,
        role: "assistant",
        t: now,
        text: "当前回复生成失败，请稍后重试。"
      };
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, messages: [...conversation.messages, assistantMessage] }
            : conversation
        )
      );
    } finally {
      setStreaming((current) => (current?.conversationId === conversationId ? null : current));
    }
  }

  return (
    <div className="prototype-root" data-theme="light" data-accent="green">
      {!isRevealed && (
        <button
          className="hidden-pill"
          onPointerDown={beginHiddenButtonMove}
          onMouseEnter={beginHoverReveal}
          onMouseLeave={clearHoverRevealTimer}
          onClick={revealNow}
        >
          <span className="hidden-pill-status" />
          <span className="hidden-pill-label">{pillLabel}</span>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="m6 9 6 6 6-6" />
          </svg>
          <span className="hidden-pill-grip" aria-hidden="true" />
        </button>
      )}

      {isRevealed && (
        <section className="panel-mover" onMouseLeave={() => {
          if (!pinned) hideNow();
        }}>
          <div className="panel">
            <div className="titlebar">
              <div className="app-mark">
                <ChatIcon width="15" height="15" strokeWidth="1.9" />
              </div>
              <div className="titlebar-title">外卖在线客服助手</div>
              <span className="online-badge">
                <span />
                在线
              </span>
              <div className="title-actions">
                <button className={`title-btn ${pinned ? "title-btn-on" : ""}`} title="固定面板（禁用自动隐藏）" onClick={() => setPinned((value) => !value)}>
                  <PinIcon width="16" height="16" strokeWidth="1.8" />
                </button>
                <button className="title-btn" title="隐藏面板" onClick={hideNow}>
                  <MinusIcon width="16" height="16" strokeWidth="2" />
                </button>
              </div>
            </div>

            {updateBannerText(updateStatus) && (
              <div className="update-banner">{updateBannerText(updateStatus)}</div>
            )}

            {!authed ? (
              <LoginView
                email={email}
                password={password}
                showPassword={showPassword}
                loginErr={loginErr}
                loggingIn={loggingIn}
                rememberPassword={rememberPassword}
                autoLogin={autoLogin}
                setEmail={(value) => {
                  setEmail(value);
                  setLoginErr("");
                }}
                setPassword={(value) => {
                  setPassword(value);
                  setLoginErr("");
                }}
                setShowPassword={setShowPassword}
                setRememberPassword={setRememberPassword}
                setAutoLogin={setAutoLogin}
                login={login}
              />
            ) : (
              <div className="authed-view">
                <Sidebar
                  conversations={conversations}
                  stats={stats}
                  account={account}
                  activeId={activeId}
                  search={search}
                  searching={searching}
                  onSearch={onSearch}
                  onClearSearch={() => {
                    setSearch("");
                    setSearching(false);
                  }}
                  onSelect={(id) => {
                    setActiveId(id);
                    void loadMessages(id);
                  }}
                  onDelete={deleteConversation}
                  onNew={() => {
                    setNewName("");
                    setNewConversationErr("");
                    setModal(true);
                  }}
                  onLogout={() => {
                    setAuthed(false);
                    setAuthToken(null);
                    setAccount(null);
                    setConversations([]);
                    setActiveId(null);
                    setStats(null);
                    setPassword("");
                  }}
                />
                <ChatArea
                  conversation={activeConversation}
                  streaming={streaming?.conversationId === activeConversation?.id ? streaming : null}
                  input={input}
                  setInput={setInput}
                  onSend={sendMessage}
                />
              </div>
            )}

            {modal && (
              <NewConversationModal
                value={newName}
                setValue={(value) => {
                  setNewName(value);
                  setNewConversationErr("");
                }}
                error={newConversationErr}
                creating={creatingConversation}
                onCreate={onCreateConversation}
                onClose={() => setModal(false)}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
