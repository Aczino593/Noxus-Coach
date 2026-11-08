// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn set_overlay_mode(window: tauri::Window, active: bool) -> Result<(), String> {
    window.set_always_on_top(active).map_err(|e| e.to_string())?;
    if active {
        let _ = window.maximize();
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_overlay_mode])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
