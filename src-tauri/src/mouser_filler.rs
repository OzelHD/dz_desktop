use serde_json::Value;

#[tauri::command]
pub async fn query_mouser_part(api_key: String, part_number: String) -> Result<Value, String> {
    let client = reqwest::Client::new();

    // Endpoint for exact part-number search
    let url = format!(
        "https://api.mouser.com/api/v1/search/partnumber?apiKey={}",
        api_key
    );

    let body = serde_json::json!({
        "SearchByPartRequest": {
            "mouserPartNumber": part_number,
            "partSearchOptions": "Exact"
        }
    });

    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request error: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("Mouser API returned HTTP {}", status));
    }

    let json: Value = response.json().await.map_err(|e| e.to_string())?;

    // Extract first part result
    let part = json["SearchResults"]["Parts"]
        .as_array()
        .and_then(|arr| arr.first())
        .cloned()
        .ok_or_else(|| "No part found".to_string())?;

    Ok(part)
}
