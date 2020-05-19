const path = require("path");
const fs = require("fs");

const showdown = require("showdown");
const converter = new showdown.Converter();
showdown.setFlavor('github');
converter.setOption("tables", true);


const mdToHtml = md => {
  const content = converter.makeHtml(md);
  const template = fs.readFileSync(path.join(__dirname, "..", "md.html")).toString();
  return template.replace("<content/>", content)
}


const log = {
  info: (arg) => console.log("[INFO]", arg),
  warn: (arg) => console.log("[WARN]", arg),
  err: (arg) => console.log("[ERROR]", arg),
};

const isDirectory = (dirPath) => {
  return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
};

const isFileEqualExtension = (file, extension) => {
  if (!extension) return false;
  let extName = extension.toLowerCase();
  extName = extName.startsWith(".") ? extName : "." + extName;
  return path.extname(file) === extName;
};

const findDirs = (dir) => {
  const dirs = [];
  if (!isDirectory(dir)) {
    return dirs;
  }

  fs.readdirSync(dir).forEach((file) => {
    const fileName = path.join(dir, file);
    if (isDirectory(fileName)) {
      dirs.push({ dir, file });
    }
  });
  return dirs;
};

const doFindFiles = (dir, filter, files = []) => {
  if (!isDirectory(dir)) {
    return;
  }

  fs.readdirSync(dir).forEach((file) => {
    const fileName = path.join(dir, file);
    if (isDirectory(fileName)) {
      const fileName = path.join(dir, file);
      doFindFiles(fileName, filter, files);
    } else if (filter(file)) {
      files.push({ dir, file });
    }
  });
};

const findFiles = (dir, filter = (file) => true) => {
  const files = [];
  doFindFiles(dir, filter, files);
  return files;
};



const scanFiles = dir => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, { withFileTypes: true }, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}

module.exports = {
  findDirs,
  findFiles,
  isDirectory,
  isFileEqualExtension,
  log,
  scanFiles,
  mdToHtml
};
