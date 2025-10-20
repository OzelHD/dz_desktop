use base64::{engine::general_purpose, Engine as _};

#[tauri::command]
pub async fn download_pdf(url: String) -> Result<String, String> {
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("HTTP error: {}", status));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read bytes: {}", e))?;

    // ✅ Convert bytes → base64 → data URI
    let encoded = general_purpose::STANDARD.encode(&bytes);
    let data_uri = format!("data:application/pdf;base64,{}", encoded);

    Ok(data_uri)
}
