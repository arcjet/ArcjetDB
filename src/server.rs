use std::path::{Path, PathBuf};
use std::{fs, io};

use rocket::http::RawStr;
use rocket::request::FromFormValue;
use rocket::response::{status, NamedFile};
use rocket::Data;
use sha2::{Digest, Sha512};
use uuid::Uuid;
// tesst only
struct AdultAge(usize);

impl<'v> FromFormValue<'v> for AdultAge {
    type Error = &'v RawStr;

    fn from_form_value(form_value: &'v RawStr) -> Result<AdultAge, &'v RawStr> {
        match form_value.parse::<usize>() {
            Ok(age) if age >= 21 => Ok(AdultAge(age)),
            _ => Err(form_value),
        }
    }
}

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
    NamedFile::open(get_path(hash.as_str().to_string())).ok()
}

#[derive(FromForm)]
struct RecordMetadata {
    publicKey: String,
}

#[derive(FromForm)]
struct RecordHeader {
    metadataHash: String,
    signature: String,
}

#[post(
    "/store",
    // format = "application/octet-stream",
    data = "<data>"
)]
fn set(data: Data) -> String {
    let tmp_file = Uuid::new_v4();
    let tmp_file_path = get_path(tmp_file.to_string());
    let temp_data = data.stream_to_file(&tmp_file_path);
    let mut file = fs::File::open(&tmp_file_path).unwrap();
    let mut hasher = Sha512::new();
    let n = io::copy(&mut file, &mut hasher).unwrap();
    let hash = hasher.result();
    println!("Path: {:?}", &tmp_file_path);
    println!("Bytes processed: {}", n);
    println!("Hash value: {:x}", hash);
    let hex_hash = hex::encode(hash);
    fs::rename(tmp_file_path, get_path(hex_hash.to_string()));
    return hex_hash;
}

#[post("/index")]
fn index() -> status::Created {
    let index = get_path("index.db");
}

fn rocket() -> rocket::Rocket {
    rocket::ignite().mount("/", routes![get, set, index])
}

pub fn new() {
    rocket().launch();
}
