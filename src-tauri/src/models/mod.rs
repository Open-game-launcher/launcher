use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct ChecksumFile {
    pub path: String,
    pub hash: String,
    pub size: i64,
}