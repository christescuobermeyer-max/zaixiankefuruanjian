import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Tauri desktop preview configuration", () => {
  it("uses Tauri for the desktop dev command and Vite only as the inner webview server", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
    const tauriConfigPath = join(process.cwd(), "src-tauri", "tauri.conf.json");

    expect(packageJson.scripts.dev).toBe("scripts\\tauri-dev.cmd");
    expect(packageJson.scripts["dev:tauri"]).toBe("tauri dev");
    expect(packageJson.scripts["web:dev"]).toBe("vite --host 127.0.0.1 --port 5173");
    expect(packageJson.scripts["tauri:build"]).toBe("tauri build");
    expect(packageJson.dependencies["@tauri-apps/api"]).toBeDefined();
    expect(packageJson.devDependencies["@tauri-apps/cli"]).toBeDefined();
    expect(existsSync(tauriConfigPath)).toBe(true);

    const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, "utf-8"));
    expect(tauriConfig.build.beforeDevCommand).toBe("pnpm desktop:before-dev");
    expect(tauriConfig.build.devUrl).toBe("http://127.0.0.1:5173");
    expect(tauriConfig.build.frontendDist).toBe("../dist");
    expect(tauriConfig.app.windows[0].title).toBe("外卖在线客服助手");
    expect(tauriConfig.app.windows[0].width).toBe(180);
    expect(tauriConfig.app.windows[0].height).toBe(42);
    expect(tauriConfig.app.windows[0].decorations).toBe(false);
    expect(tauriConfig.app.windows[0].resizable).toBe(false);
    expect(tauriConfig.app.windows[0].alwaysOnTop).toBe(true);
    expect(tauriConfig.app.windows[0].transparent).toBe(true);
    expect(tauriConfig.app.windows[0].shadow).toBe(false);
  });

  it("starts the backend API before the desktop webview dev server", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
    const script = readFileSync(join(process.cwd(), "scripts", "before-dev.cmd"), "utf-8");

    expect(packageJson.scripts["desktop:before-dev"]).toBe("scripts\\before-dev.cmd");
    expect(script).toContain("pnpm.cmd --filter server dev");
    expect(script).toContain("pnpm.cmd web:dev");
  });

  it("uses Rust commands to resize the actual Tauri window and keep panel position anchored to the button", () => {
    const libRs = readFileSync(join(process.cwd(), "src-tauri", "src", "lib.rs"), "utf-8");

    expect(libRs).toContain("fn reveal_panel");
    expect(libRs).toContain("fn hide_panel");
    expect(libRs).toContain("fn move_hidden_button");
    expect(libRs).toContain("struct WindowAnchorState");
    expect(libRs).toContain("fn remember_anchor_center");
    expect(libRs).toContain("remember_anchor_center(state, anchor_center_x)");
    expect(libRs).not.toContain("remember_anchor_center(state, x + (width / 2.0))");
    expect(libRs).toContain("fn anchored_x_for_width");
    expect(libRs).toContain("current_window_anchor_center_x");
    expect(libRs).toContain(".manage(WindowAnchorState::default())");
    expect(libRs).toContain("set_size");
    expect(libRs).toContain("set_position");
    expect(libRs).not.toContain("fn apply_top_center_layout");
    expect(libRs).toContain("generate_handler![reveal_panel, hide_panel, move_hidden_button]");
  });

  it("styles the hidden top button as a rounded green AI customer-service capsule", () => {
    const css = readFileSync(join(process.cwd(), "src", "App.css"), "utf-8");

    expect(css).toContain("border-radius: 999px");
    expect(css).toContain("linear-gradient(135deg, #22c55e 0%, #16a34a 48%, #15803d 100%)");
    expect(css).toContain("background: transparent");
    expect(css).toContain(".hidden-pill-label");
    expect(css).toContain(".hidden-pill-grip");
  });

  it("lets the expanded chat panel fill the whole native window without an outer frame", () => {
    const css = readFileSync(join(process.cwd(), "src", "App.css"), "utf-8").replace(/\r\n/g, "\n");

    expect(css).toContain(".panel-mover {\n  position: absolute;\n  inset: 0;");
    expect(css).toContain(".panel {\n  position: relative;\n  width: 100%;\n  height: 100%;");
    expect(css).not.toContain("max-width: 96%");
    expect(css).not.toContain("height: 560px");
    expect(css).not.toContain("border-radius: 0 0 16px 16px");
  });
});
