use serde::{Deserialize, Serialize};
use std::fs::{create_dir, create_dir_all, remove_file, OpenOptions};
use std::io::Write;
use std::path::Path;
use std::time::Duration;
use tauri::http::StatusCode;
use tauri::ipc::Channel;
use tauri_plugin_http::reqwest;
use crate::throttle;

#[derive(Serialize, Deserialize, Clone)]
pub struct Progress {
    total_size: u64,
    downloaded_size: u64,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadGameFileRequest {
    url: String,
    download_dir: String,
    dest_path: String,
}

#[tauri::command]
pub async fn download_game_file(
    request: DownloadGameFileRequest,
    channel: Channel<Progress>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut downloaded_size = 0;
    let download_dir = Path::new(&request.download_dir);
    let channel_ref = &channel;

    if !download_dir.exists() {
        match create_dir(download_dir) {
            Ok(_) => {}
            Err(_) => {}
        }
    }

    let file_path = Path::new(&request.dest_path);

    if !file_path.exists() {
        create_dir_all(file_path.parent().unwrap())
            .map_err(|err| format!("Error creating dir all: {} {}", file_path.parent().unwrap().display(), err.to_string()))?;
    } else {
        remove_file(file_path).map_err(|err| format!("Error removing file: {} {}", file_path.to_str().unwrap(), err.to_string()))?;
    }

    let mut response = match client.get(&request.url).send().await {
        Ok(response) => response,
        Err(error) => {
            eprintln!("Error: {}", error);
            return Err(String::from(format!(
                "An error ocurred trying to fetch {} file. Status: {}",
                &request.url,
                error.status().unwrap_or_default()
            )));
        }
    };

    let content_length = response.content_length().unwrap_or(0);
    let mut file = OpenOptions::new().write(true).truncate(true).create(true).open(&request.dest_path).map_err(|err| format!("Error opening file: {} {}", request.dest_path, err.to_string()))?;
    let mut send_progress = throttle!(|downloaded_size: u64| {
        channel_ref.send(Progress {
            total_size: content_length,
            downloaded_size,
        }).unwrap();
    }, Duration::from_millis(250));

    if response.status() != StatusCode::OK {
        return Err("404 Not found".to_string());
    }

    while let Some(chunk) = response.chunk().await.map_err(|err| err.to_string())? {
        downloaded_size += chunk.len() as u64;
        send_progress(downloaded_size);
        file.write_all(&chunk).map_err(|err| format!("Error writing file: {}", err.to_string()))?;
    }

    let progress = Progress {
        total_size: content_length,
        downloaded_size: content_length,
    };

    Ok(serde_json::to_string(&progress).unwrap_or(String::from("{}")))
}
