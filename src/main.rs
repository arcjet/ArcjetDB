extern crate chrono;
extern crate iron;
extern crate mount;
extern crate serde;
extern crate serde_derive;
extern crate serde_json;
extern crate staticfile;

// mod store;

// use store::*;

mod server;

use server::Server;

fn main() {
    println!("Serving on port 3000");
    Server::new();
}
