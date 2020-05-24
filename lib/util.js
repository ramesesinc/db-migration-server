const path = require("path");
const fs = require("fs");
const util = require("util");
const readdir = util.promisify(fs.readdir);

const loadFiles = async (dir, filter, handler) => {
  const files = await readdir(dir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pathName = path.join(dir, file);
    if (fs.lstatSync(pathName).isDirectory()) {
      await loadFiles(pathName, filter, handler);
    } else if (filter(file)) {
      try {
        const data = fs.readFileSync(path.join(dir, file));
        handler(file, data, pathName);
      } catch (err) {
        log.error(file + ": " + err);
      }
    }
  }
};

const log = {
  info: (...args) => console.log("INFO", args),
  warn: (...args) => console.log("WARN", args),
  error: (...args) => console.log("ERROR", args),
};


module.exports = {
  loadFiles,
}