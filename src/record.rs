use serde_json::{from_str, to_string};

pub struct Metadata {
    user: Vec,
    site: Vec,
    link: Vec,
    tag: Vec,
    time: u8,
    type: Vec,
    version: Vec,
    network: Vec,
}

impl Record {
    pub fn new(data: Vec, metadata: Metadata, secretKey: Vec) {

    }
}