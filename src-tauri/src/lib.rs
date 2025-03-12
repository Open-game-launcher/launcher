use tauri_plugin_http::reqwest;
mod commands;
mod macros;

use commands::download_checksum::download_checksum;
use commands::download_game_file::download_game_file;

#[tauri::command]
async fn get_version_file(url: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = match client.get(url).send().await {
        Ok(response) => response,
        Err(error) => {
            eprintln!("Error: {}", error);
            return Err(String::from(format!(
                "An error occurred trying to fetch version file. Status: {}",
                error.status().unwrap_or_default()
            )));
        }
    };

    let version = response.text().await.unwrap_or_default();
    Ok(version)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            download_checksum,
            download_game_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
