use std::io;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha512};
use uuid::Uuid;

use rocket::http::RawStr;
use rocket::response::NamedFile;
use rocket::Data;

// #[get("/")]
// fn index() -> io::Result<NamedFile> {
//     NamedFile::open("static/index.html")
// }

fn get_path(file: String) -> PathBuf {
    let home_dir = dirs::home_dir().unwrap();
    Path::new(&home_dir).join(".arcjet").join(file)
}

// fn hash_rename(content: Vec<u8>) {
//     let mut hasher = Sha512::new();
//     hasher.input(content);
//     hasher.result()
// }

#[get("/store/<hash>")]
fn get(hash: &RawStr) -> Option<NamedFile> {
    NamedFile::open(get_path(hash.as_str())).ok()
}

struct RecordMetadata {
    publicKey: String,
}

struct RecordHeader {
    metadataHash: String,
    signature: String,
}

#[derive(FromForm)]
struct RecordData {
    metadata: RecordMetadata,
    header: RecordHeader,
}

#[post(
    "/store",
    format = "application/octet-stream",
    data = "<data>"
)]
fn set(data: Data) -> Option<NamedFile> {
    let tmp_file = Uuid::new_v4();
    let tmp_file_path = get_path(tmp_file);
    // println!("{}", tmp_file_path);
    // content.stream_to_file(tmp_file_path).unwrap();
    // hash_rename(tmp_file_path);
    let mut hasher = Sha512::new();
    let stream = data.open();
    io::copy(&mut data.open(), hasher);
    let hash = hasher.result();
    println!("{}", hash);
}

#[post("/index")]
fn index() -> Option<NamedFile> {
    let home_dir = dirs::home_dir().unwrap();
    NamedFile::open(get_path()).ok()
}

fn rocket() -> rocket::Rocket {
    rocket::ignite().mount("/", routes![get])
}

pub fn new() {
    rocket().launch();
}
