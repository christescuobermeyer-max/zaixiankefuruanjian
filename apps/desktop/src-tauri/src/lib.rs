use std::sync::Mutex;
use tauri::{LogicalPosition, LogicalSize, Manager, Position, Size, WebviewWindow};

const HIDDEN_WIDTH: f64 = 180.0;
const HIDDEN_HEIGHT: f64 = 42.0;
const PANEL_WIDTH: f64 = 720.0;
const PANEL_HEIGHT: f64 = 588.0;

#[derive(Default)]
struct WindowAnchorState {
    center_x: Mutex<Option<f64>>,
}

fn monitor_bounds(window: &WebviewWindow) -> tauri::Result<Option<(f64, f64, f64)>> {
    let monitor = window
        .current_monitor()?
        .or(window.primary_monitor()?);

    let Some(monitor) = monitor else {
        return Ok(None);
    };

    let scale_factor = monitor.scale_factor();
    let work_area = monitor.work_area();
    let min_x = work_area.position.x as f64 / scale_factor;
    let top_y = work_area.position.y as f64 / scale_factor;
    let width = work_area.size.width as f64 / scale_factor;

    Ok(Some((min_x, top_y, width)))
}

fn current_window_anchor_center_x(window: &WebviewWindow, fallback_width: f64) -> f64 {
    let scale_factor = window.scale_factor().unwrap_or(1.0);
    let x = window
        .outer_position()
        .map(|position| position.x as f64 / scale_factor)
        .unwrap_or(0.0);
    let width = window
        .outer_size()
        .map(|size| size.width as f64 / scale_factor)
        .unwrap_or(fallback_width);

    x + (width / 2.0)
}

fn anchored_x_for_width(anchor_center_x: f64, target_width: f64, min_x: f64, available_width: f64) -> f64 {
    let max_x = min_x + available_width - target_width;
    (anchor_center_x - (target_width / 2.0)).clamp(min_x, max_x.max(min_x))
}

fn remembered_anchor_center(state: &WindowAnchorState) -> Option<f64> {
    state.center_x.lock().ok().and_then(|center_x| *center_x)
}

fn remember_anchor_center(state: &WindowAnchorState, center_x: f64) {
    if let Ok(mut stored_center_x) = state.center_x.lock() {
        *stored_center_x = Some(center_x);
    }
}

fn apply_top_anchor_layout(
    window: &WebviewWindow,
    state: &WindowAnchorState,
    width: f64,
    height: f64,
    fallback_width: f64,
) -> tauri::Result<()> {
    let anchor_center_x = remembered_anchor_center(state)
        .unwrap_or_else(|| current_window_anchor_center_x(window, fallback_width));
    let Some((min_x, top_y, available_width)) = monitor_bounds(window)? else {
        let x = (anchor_center_x - (width / 2.0)).max(0.0);
        window.set_size(Size::Logical(LogicalSize::new(width, height)))?;
        window.set_position(Position::Logical(LogicalPosition::new(x, 0.0)))?;
        remember_anchor_center(state, anchor_center_x);
        return Ok(());
    };

    let x = anchored_x_for_width(anchor_center_x, width, min_x, available_width);
    window.set_size(Size::Logical(LogicalSize::new(width, height)))?;
    window.set_position(Position::Logical(LogicalPosition::new(x, top_y)))?;
    remember_anchor_center(state, anchor_center_x);
    Ok(())
}

#[tauri::command]
fn reveal_panel(window: WebviewWindow) -> Result<(), String> {
    let state = window.state::<WindowAnchorState>();
    apply_top_anchor_layout(&window, &state, PANEL_WIDTH, PANEL_HEIGHT, HIDDEN_WIDTH).map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn hide_panel(window: WebviewWindow) -> Result<(), String> {
    let state = window.state::<WindowAnchorState>();
    apply_top_anchor_layout(&window, &state, HIDDEN_WIDTH, HIDDEN_HEIGHT, PANEL_WIDTH).map_err(|error| error.to_string())
}

#[tauri::command]
fn move_hidden_button(window: WebviewWindow, delta_x: f64) -> Result<(), String> {
    let state = window.state::<WindowAnchorState>();
    let scale_factor = window.scale_factor().map_err(|error| error.to_string())?;
    let position = window.outer_position().map_err(|error| error.to_string())?;

    let Some((min_x, top_y, available_width)) = monitor_bounds(&window).map_err(|error| error.to_string())? else {
        let next_x = (position.x as f64 / scale_factor) + delta_x;
        window
            .set_position(Position::Logical(LogicalPosition::new(next_x.max(0.0), 0.0)))
            .map_err(|error| error.to_string())?;
        remember_anchor_center(&state, next_x.max(0.0) + (HIDDEN_WIDTH / 2.0));
        return Ok(());
    };

    let max_x = min_x + available_width - HIDDEN_WIDTH;
    let next_x = ((position.x as f64 / scale_factor) + delta_x).clamp(min_x, max_x.max(min_x));

    window
        .set_position(Position::Logical(LogicalPosition::new(next_x, top_y)))
        .map_err(|error| error.to_string())?;
    remember_anchor_center(&state, next_x + (HIDDEN_WIDTH / 2.0));
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(WindowAnchorState::default())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let state = app.state::<WindowAnchorState>();
                apply_top_anchor_layout(&window, &state, HIDDEN_WIDTH, HIDDEN_HEIGHT, HIDDEN_WIDTH)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![reveal_panel, hide_panel, move_hidden_button])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
