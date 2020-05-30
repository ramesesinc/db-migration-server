const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const util = require("util");
const readdir = util.promisify(fs.readdir);

const showdown = require("showdown");
const converter = new showdown.Converter();
showdown.setFlavor("github");
converter.setOption("tables", true);

const mdToHtml = (md) => {
  const content = converter.makeHtml(md);
  const template = fs
    .readFileSync(path.join(__dirname, "..", "md.html"))
    .toString();
  return template.replace("<content/>", content);
};

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

const scanFiles = (dir) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, { withFileTypes: true }, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
};

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

const interpolate = (env, source) => {
  let pass;
  do {
    pass = false;
    for (let key in env) {
      if (env.hasOwnProperty(key)) {
        let value = env[key];
        const matches = value.match(/\${(.+?)}/i);
        if (matches && matches.length >= 2) {
          const newValue = source[matches[1]];
          if (newValue && !/\${.+}/i.test(newValue)) {
            env[key] = value.replace(matches[0], newValue);
            pass = true;
          }
        }
      }
    }
  } while (pass);
};

const substituteProcessEnvValues = (env) => {
  if (process.env.NODE_ENV) {
    pass = interpolate(env, process.env);
  } else {
    pass = interpolate(env, global.gConfig);
  }
};

const interpolateEnvValues = (env) => {
  interpolate(env, env);
};

const parseEnvFile = (envFile) => {
  let env = {};
  if (envFile) {
    try {
      env = dotenv.parse(fs.readFileSync(envFile));
      substituteProcessEnvValues(env);
      interpolateEnvValues(env);
    } catch (err) {
      console.log(`${err}`);
    }
  }
  return env;
};

module.exports = {
  findDirs,
  findFiles,
  isDirectory,
  isFileEqualExtension,
  log,
  scanFiles,
  mdToHtml,
  parseEnvFile,
  loadFiles,
};
