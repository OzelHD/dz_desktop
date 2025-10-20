use std::fs::OpenOptions;
use std::io::Write;

#[tauri::command]
pub fn append_to_csv(path: String, line: String) -> Result<(), String> {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;

    writeln!(file, "{}", line).map_err(|e| e.to_string())?;
    Ok(())
}
