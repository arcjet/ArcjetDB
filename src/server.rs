use std::io;
use std::path::{Path};

use rocket::http::RawStr;
use rocket::response::{NamedFile};

#[get("/")]
fn index() -> io::Result<NamedFile> {
    NamedFile::open("static/index.html")
}

#[get("/index.js")]
fn files() -> Option<NamedFile> {
    NamedFile::open(Path::new("static/index.js")).ok()
}

#[get("/store/<hash>")]
fn get(hash: &RawStr) -> Option<NamedFile> {
    let home_dir = dirs::home_dir().unwrap();
    NamedFile::open(Path::new(&home_dir).join(".arcjet").join(hash.as_str())).ok()
}

fn rocket() -> rocket::Rocket {
    rocket::ignite().mount("/", routes![index, files, get])
}

pub fn new() {
    rocket().launch();
}
