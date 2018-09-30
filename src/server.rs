use std::path::Path;

use iron::Iron;
use mount::Mount;
use staticfile::Static;

pub trait Server {

}

impl Server {
    pub fn new() {
        let mut mount = Mount::new();

        mount.mount("/", Static::new(Path::new("static/index.html")));
        mount.mount("/index.js", Static::new(Path::new("static/index.js")));

        Iron::new(mount).http("127.0.0.1:3000").unwrap();
    }
}
