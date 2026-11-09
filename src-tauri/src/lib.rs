use serde_json::{json, Value};
use std::{env, fs, path::PathBuf, time::Duration};

fn league_lockfile() -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(dir) = env::var_os("NOXUS_LEAGUE_DIR") {
        let path = PathBuf::from(dir);
        candidates.push(if path.file_name().and_then(|name| name.to_str()) == Some("lockfile") { path } else { path.join("lockfile") });
    }
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = env::var_os("HOME") {
            candidates.push(PathBuf::from(&home).join("Applications/League of Legends.app/Contents/LoL/lockfile"));
        }
        candidates.push(PathBuf::from("/Applications/League of Legends.app/Contents/LoL/lockfile"));
    }
    #[cfg(target_os = "windows")]
    for drive in ["C:", "D:", "E:"] {
        candidates.push(PathBuf::from(format!("{drive}\\Riot Games\\League of Legends\\lockfile")));
    }
    #[cfg(target_os = "linux")]
    if let Some(home) = env::var_os("HOME") {
        candidates.push(PathBuf::from(home).join("Games/league-of-legends/drive_c/Riot Games/League of Legends/lockfile"));
    }
    candidates.into_iter().find(|path| path.is_file())
}

#[tauri::command]
async fn get_champ_select_session() -> Value {
    let Some(lockfile) = league_lockfile() else {
        return json!({ "connected": false, "inChampSelect": false, "reason": "no_lockfile" });
    };
    let Ok(contents) = fs::read_to_string(lockfile) else {
        return json!({ "connected": false, "inChampSelect": false, "reason": "lockfile_unreadable" });
    };
    let parts: Vec<&str> = contents.trim().split(':').collect();
    if parts.len() < 5 || parts[2].parse::<u16>().is_err() {
        return json!({ "connected": false, "inChampSelect": false, "reason": "lockfile_invalid" });
    }
    let port = parts[2];
    let password = parts[3];
    let client = match reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(Duration::from_secs(2))
        .build()
    {
        Ok(client) => client,
        Err(_) => return json!({ "connected": false, "inChampSelect": false, "reason": "client_error" }),
    };
    let response = client
        .get(format!("https://127.0.0.1:{port}/lol-champ-select/v1/session"))
        .basic_auth("riot", Some(password))
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await;
    let Ok(response) = response else {
        return json!({ "connected": false, "inChampSelect": false, "reason": "client_unavailable" });
    };
    if !response.status().is_success() {
        return json!({ "connected": true, "inChampSelect": false });
    }
    match response.json::<Value>().await {
        Ok(session) => json!({ "connected": true, "inChampSelect": true, "session": session }),
        Err(_) => json!({ "connected": true, "inChampSelect": false, "reason": "invalid_response" }),
    }
}

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
            get_champ_select_session,
            minimize_window,
            toggle_maximize_window,
            close_window,
            is_window_maximized
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
