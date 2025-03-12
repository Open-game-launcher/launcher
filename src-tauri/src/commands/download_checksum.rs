use serde::{Deserialize, Serialize};
use tauri_plugin_http::reqwest;

#[derive(Serialize, Deserialize, Debug)]
pub struct ChecksumFile {
    path: String,
    hash: String,
    size: i64,
}

#[tauri::command]
pub async fn download_checksum(url: &str) -> Result<String, String> {
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

    let mut files: Vec<ChecksumFile> = vec![];
    let checksum = response.text().await.unwrap_or_default();

    for line in checksum.lines() {
        let line_split = line.split('\t').collect::<Vec<&str>>();
        let path = String::from(line_split[0]);
        let hash = String::from(line_split[1]);
        let size = match line_split[2].parse::<i64>() {
            Ok(size) => size,
            Err(_) => {
                return Err(String::from(format!(
                    "Error parsing checksum file: Invalid size for file {}",
                    path
                )));
            }
        };

        files.push(ChecksumFile { path, hash, size });
    }

    let json_string = match serde_json::to_string(&files) {
        Ok(string) => string,
        Err(err) => {
            eprintln!("{}", err);
            return Err(String::from(
                "Error serializing json file with checksum contents",
            ));
        }
    };

    Ok(json_string)
}