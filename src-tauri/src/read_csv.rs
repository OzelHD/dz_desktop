use std::fs;
use std::path::Path;
use tauri::command;

/// Reads a CSV file, removes comment lines, and returns the cleaned content as a string.
#[command]
pub fn read_csv_file(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    if !file_path.is_file() {
        return Err(format!("Path is not a file: {}", path));
    }

    let content =
        fs::read_to_string(file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Remove comment lines
    let cleaned: String = content
        .lines()
        .filter(|line| {
            let trimmed = line.trim_start();
            !trimmed.starts_with('#')
                && !trimmed.starts_with("//")
                && !trimmed.starts_with(';')
                && !trimmed.is_empty()
        })
        .collect::<Vec<_>>()
        .join("\n");

    Ok(cleaned)
}
