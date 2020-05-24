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

const sqlExecutors = {};

const getExecutor = (name) => {
  const executor = sqlExecutors[name];
  if (!executor) throw Error(name + " is not registered");
  return executor;
};

const buildFieldsArray = (sql) => {
  const fields = [];
  const result = sql.matchAll(/\$P{(.+)}/gim);
  const matches = Array.from(result);
  matches.forEach((match) => {
    fields.push(match[1]);
  });
  return fields;
};

const createSqlExecutor = (file, sqlMethod, rawSql) => {
  const newMethod = (params = {}) => {
    const fields = buildFieldsArray(rawSql);
    const sql = rawSql
      .replace(/\$P{.+}/gim, "?")
      .replace(/\n/gm, " ")
      .trim();
    const values = [];
    fields.forEach((fld) => {
      values.push({[fld]: params[fld]});
    });
    return [sql, values];
  };

  const sqlName = file.replace(".sql", "");
  let executor = sqlExecutors[sqlName];
  if (!executor) {
    executor = {};
    sqlExecutors[sqlName] = executor;
  }
  executor[sqlMethod] = newMethod;
};

const createSqlExecutors = (file, sqlText) => {
  const keyRegex = /\[(.+)\]/;
  const res = sqlText.split(keyRegex);
  for (let i = 1; i < res.length; i += 2) {
    createSqlExecutor(file, res[i], res[i + 1]);
  }
};

const loadSqlFiles = async (sqlPath) => {
  await loadFiles(
    sqlPath,
    (file) => file.endsWith(".sql"),
    (file, sqlText, dir) => {
      createSqlExecutors(file, sqlText.toString());
    }
  );
};

const loadResources = async (sqlDir) => {
  await loadSqlFiles(sqlDir);
};

class ActiveDb {
  constructor(sqlName, provider) {
    this._sqlName = sqlName;
    this._provider = provider;
  }
}

module.exports = {
  loadResources,
  getExecutor,
};
