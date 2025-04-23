use std::fs;
use crate::utils::parse_checksum_file::parse_checksum_file;

#[tauri::command]
pub async fn parse_local_checksum(uri: &str) -> Result<String, String> {
    let file = fs::read_to_string(uri).map_err(|err| {
        eprintln!("{}", err);
        return String::from(format!("Error reading file {}", uri));
    })?;

    let json_string = parse_checksum_file(file.lines())?;
    Ok(json_string)
}