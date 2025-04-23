use std::str::Lines;
use crate::models::ChecksumFile;

pub fn parse_checksum_file(lines: Lines<'_>) -> Result<String, String> {
    let mut files: Vec<ChecksumFile> = vec![];

    for line in lines {
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