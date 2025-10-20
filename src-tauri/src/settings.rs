use serde_json::{Map, Value};
use std::{fs, path::PathBuf};

/// Simple cross-platform helpers (no external crate required)
fn app_config_dir_fallback() -> Option<PathBuf> {
    // Windows: %APPDATA%
    if cfg!(windows) {
        std::env::var("APPDATA").map(PathBuf::from).ok()
    } else if cfg!(target_os = "macos") {
        // macOS: $HOME/Library/Application Support
        std::env::var("HOME")
            .map(|h| PathBuf::from(h).join("Library").join("Application Support"))
            .ok()
    } else {
        // Linux/others: $XDG_CONFIG_HOME or $HOME/.config
        std::env::var("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .ok()
            .or_else(|| {
                std::env::var("HOME")
                    .map(|h| PathBuf::from(h).join(".config"))
                    .ok()
            })
    }
}

fn home_dir_fallback() -> Option<PathBuf> {
    std::env::var("HOME")
        .map(PathBuf::from)
        .ok()
        .or_else(|| std::env::var("USERPROFILE").map(PathBuf::from).ok())
}

fn settings_file_path() -> PathBuf {
    // prefer platform config dir, fall back to home dir, then current dir
    let mut dir = app_config_dir_fallback()
        .or_else(home_dir_fallback)
        .unwrap_or_else(|| PathBuf::from("."));
    dir.push("dz_desktop");
    // ensure directory exists
    let _ = std::fs::create_dir_all(&dir);
    dir.push("settings.json");
    dir
}

fn read_settings_file() -> Value {
    let path = settings_file_path();
    match fs::read_to_string(&path) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_else(|_| Value::Object(Map::new())),
        Err(_) => Value::Object(Map::new()),
    }
}

fn write_settings_file(value: &Value) -> Result<(), String> {
    let path = settings_file_path();
    let s = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    fs::write(&path, s).map_err(|e| e.to_string())
}

/// Return the full settings object
#[tauri::command]
pub fn get_all_settings() -> Value {
    read_settings_file()
}

/// Return a single key if present
#[tauri::command]
pub fn get_setting(key: String) -> Option<Value> {
    read_settings_file().get(&key).cloned()
}

/// Set a single key and persist
#[tauri::command]
pub fn set_setting(key: String, value: Value) -> Result<(), String> {
    let mut obj = read_settings_file()
        .as_object()
        .cloned()
        .unwrap_or_default();
    obj.insert(key, value);
    write_settings_file(&Value::Object(obj))
}

/// Remove a key and persist
#[tauri::command]
pub fn remove_setting(key: String) -> Result<(), String> {
    let mut obj = read_settings_file()
        .as_object()
        .cloned()
        .unwrap_or_default();
    obj.remove(&key);
    write_settings_file(&Value::Object(obj))
}


