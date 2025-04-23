mod commands;
mod macros;
mod models;
mod utils;

use commands::parse_server_checksum::parse_server_checksum;
use commands::download_game_file::download_game_file;
use commands::parse_local_checksum::parse_local_checksum;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            parse_local_checksum,
            parse_server_checksum,
            download_game_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
