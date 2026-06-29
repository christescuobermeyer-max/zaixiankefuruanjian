// 发布(非 debug)构建下隐藏 Windows 控制台窗口，避免启动时弹出终端。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    zaixiankefu_desktop_lib::run();
}
