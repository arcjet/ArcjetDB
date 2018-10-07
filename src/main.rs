#![feature(plugin, decl_macro, proc_macro_non_items)]
#![plugin(rocket_codegen)]

#[macro_use]
extern crate rocket;
extern crate chrono;
extern crate dirs;
extern crate serde;
extern crate serde_derive;
extern crate serde_json;
extern crate sha2;
extern crate uuid;

// mod store;

// use store::*;

mod server;

fn main() {
    println!("Serving on port 3000");
    server::new();
}
