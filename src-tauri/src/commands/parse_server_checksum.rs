use tauri_plugin_http::reqwest;
use crate::utils::parse_checksum_file::parse_checksum_file;

#[tauri::command]
pub async fn parse_server_checksum(url: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = match client.get(url).send().await {
        Ok(response) => response,
        Err(error) => {
            eprintln!("Error: {}", error);
            return Err(String::from(format!(
                "An error occurred trying to fetch checksum file. Status: {}",
                error.status().unwrap_or_default()
            )));
        }
    };


    let checksum = response.text().await.unwrap_or_default();
    let json_string = parse_checksum_file(checksum.lines())?;

    Ok(json_string)
}