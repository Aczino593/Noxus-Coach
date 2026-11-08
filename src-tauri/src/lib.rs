#[tauri::command]
fn set_overlay_mode(window: tauri::Window, active: bool) -> Result<(), String> {
    window.set_always_on_top(active).map_err(|e| e.to_string())?;
    if active {
        let _ = window.maximize();
    }
    Ok(())
}

#[tauri::command]
fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_maximize_window(window: tauri::Window) -> Result<(), String> {
    let is_max = window.is_maximized().map_err(|e| e.to_string())?;
    if is_max {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
fn is_window_maximized(window: tauri::Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            set_overlay_mode,
            minimize_window,
            toggle_maximize_window,
            close_window,
            is_window_maximized
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
