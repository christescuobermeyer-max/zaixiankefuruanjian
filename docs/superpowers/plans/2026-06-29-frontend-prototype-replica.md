# Frontend Prototype Replica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable React + Vite desktop frontend in `apps/desktop` that visually and interactively replicates `前端ui原型图/外卖客服桌面助手.dc.html`.

**Architecture:** The desktop package is a React single-page app that simulates the Tauri panel experience in a browser/WebView. State is kept locally in React for panel visibility, login, conversations, search, modal, message sending, and streaming animation. No real Supabase, backend API, Rust command, or updater integration is included in this phase.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, React Testing Library, jsdom, CSS variables, inline SVG icons.

## Global Constraints

- Every assistant response must be in Chinese.
- Keep server secrets out of the desktop frontend.
- Do not implement real Supabase login, backend API calls, Tauri Rust commands, or updater behavior in this phase.
- Preserve the prototype's 720px by 560px top-centered panel layout and the 1280x800 preview behavior.
- Run `pnpm --filter desktop test`, `pnpm --filter desktop build`, and `python scripts/verify.py` before claiming completion.

---

### Task 1: Desktop Package Scaffold

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/tsconfig.node.json`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/src/main.tsx`
- Create: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/App.css`
- Delete: `apps/desktop/src/.gitkeep`

**Interfaces:**
- Produces: a Vite React app mounted at `#root`.
- Produces: `App` default export from `apps/desktop/src/App.tsx`.

- [ ] **Step 1: Add package manifest**

Create `apps/desktop/package.json` with scripts:

```json
{
  "name": "desktop",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -p tsconfig.json && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.1.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "vite": "^8.1.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^18.3.27",
    "@types/react-dom": "^18.3.7",
    "jsdom": "^27.3.0",
    "typescript": "^5.9.3",
    "vitest": "^4.0.15"
  }
}
```

- [ ] **Step 2: Add TypeScript and Vite config**

Create `tsconfig.json`, `tsconfig.node.json`, and `vite.config.ts` with React JSX, strict TypeScript, Vite build output to `dist`, and Vitest `jsdom` environment.

- [ ] **Step 3: Add HTML and root React files**

Create `index.html`, `src/main.tsx`, `src/App.tsx`, and `src/App.css`. `App.tsx` should render a placeholder with text `外卖在线客服助手`; `App.css` should set `html`, `body`, and `#root` to full height.

- [ ] **Step 4: Verify scaffold**

Run `pnpm install --frozen-lockfile`, then `pnpm --filter desktop build`.
Expected: build exits 0 and produces `apps/desktop/dist`.

### Task 2: Local State and Interaction Model

**Files:**
- Create: `apps/desktop/src/prototypeData.ts`
- Create: `apps/desktop/src/prototypeLogic.ts`
- Create: `apps/desktop/src/prototypeLogic.test.ts`
- Modify: `apps/desktop/src/App.tsx`

**Interfaces:**
- Produces: `Conversation`, `Message`, `initialConversations`.
- Produces: `replyFor(text: string, shop: string): string`.
- Produces: `filterConversations(conversations: Conversation[], query: string): Conversation[]`.
- Produces: `createConversation(name: string): Conversation`.

- [ ] **Step 1: Write failing logic tests**

Tests cover: empty search returns all conversations for normal mode helpers, query `川` matches `川味小厨`, `replyFor("申请退款", "川味小厨")` contains refund copy, and `createConversation("新店")` returns a conversation named `新店` with a pending welcome reply.

- [ ] **Step 2: Implement data and helpers**

Move the prototype's three initial conversations into typed data. Implement keyword reply rules from the prototype and helper functions for search and new conversation creation.

- [ ] **Step 3: Run logic tests**

Run `pnpm --filter desktop test -- src/prototypeLogic.test.ts`.
Expected: tests pass.

### Task 3: Visual Shell and Panel States

**Files:**
- Create: `apps/desktop/src/icons.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/App.css`
- Create: `apps/desktop/src/App.test.tsx`

**Interfaces:**
- Consumes: `initialConversations` from `prototypeData.ts`.
- Produces: rendered hidden shell, hotzone, taskbar, and panel with login form.

- [ ] **Step 1: Write failing UI test for panel reveal**

Render `<App />`, assert `客服` pill and hint exist, click the pill, assert title `外卖在线客服助手`, login heading, email input, and password input exist.

- [ ] **Step 2: Implement desktop shell**

Render the desktop background, left desktop icons, bottom taskbar, top hotzone, hidden pill, hint, and top-centered panel. Panel starts hidden and opens by click or mouse enter.

- [ ] **Step 3: Implement titlebar and login form**

Add titlebar, online badge, pin button, hide button, login form, password toggle, validation error, and local loading transition.

- [ ] **Step 4: Run UI test**

Run `pnpm --filter desktop test -- src/App.test.tsx`.
Expected: panel reveal test passes.

### Task 4: Authenticated Chat UI

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/App.css`
- Modify: `apps/desktop/src/App.test.tsx`

**Interfaces:**
- Consumes: conversation data and helper functions.
- Produces: local chat panel with sidebar, search, message list, chips, input, and modal.

- [ ] **Step 1: Add failing tests for login, search, and modal**

Tests cover: login with empty password shows `请输入密码`; login with non-empty password shows `新建对话`; searching `川` shows `搜索结果`; clicking `新建对话` opens `开启新对话`.

- [ ] **Step 2: Implement authenticated layout**

Render sidebar with new conversation button, search field, search result states, conversation list, user area, chat header, context compaction badge, messages, quick chips, input box, and send button.

- [ ] **Step 3: Implement modal and conversation creation**

Render modal with focused-looking input, disabled create button when empty, and insertion of the new conversation at the top when created.

- [ ] **Step 4: Run UI tests**

Run `pnpm --filter desktop test -- src/App.test.tsx`.
Expected: all App tests pass.

### Task 5: Streaming Interaction and Verification

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/App.css`
- Modify: `apps/desktop/src/App.test.tsx`

**Interfaces:**
- Consumes: `replyFor`.
- Produces: simulated streaming replies and final verification-ready frontend.

- [ ] **Step 1: Add failing send test**

Login, select or keep `川味小厨`, type `催一下单`, click send, assert the user message appears and an assistant streaming or final reply appears.

- [ ] **Step 2: Implement send and streaming simulation**

Append user message immediately, generate reply with `replyFor`, show streaming bubble with caret, then append final assistant message.

- [ ] **Step 3: Verify build and constraints**

Run:

```bash
pnpm --filter desktop test
pnpm --filter desktop build
python scripts/verify.py
```

Expected: all commands exit 0.

- [ ] **Step 4: Start preview server**

Run `pnpm --filter desktop dev`. Report the local URL printed by Vite.

