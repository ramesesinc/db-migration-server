const path = require("path");
const fs = require("fs");

const createActiveDbFromSqlFile = (sqlName, dir, provider) => {
  const sqlFileName = path.join(dir, `${sqlName}.sql`);
  const sqlBuffer = fs.readFileSync(sqlFileName);
  return new ActiveDb(sqlName, sqlBuffer.toString(), provider);
};

const activeDbCache = {};

const getActiveDb = (sqlName, dir, provider) => {
  let activeDb = activeDbCache[sqlName];
  if (!activeDb) {
    try {
      activeDb = createActiveDbFromSqlFile(sqlName, dir, provider);
      activeDbCache[activeDb.name] = activeDb;
    } catch (err) {
      console.log("ERROR =========== ", err);
      throw `${sqlName}.sql does not exist.`
    }
  }
  return activeDb;
};

class ActiveDb {
  constructor(sqlName, sqlText, provider) {
    this._name = sqlName;
    this._provider = provider;
    this.parseSql(sqlText);
  }

  get name() {
    return this._name;
  }

  parseSql(sqlText) {
    const keyRegex = /\[(.+)\]/;
    const res = sqlText.split(keyRegex);
    for (let i = 1; i < res.length; i += 2) {
      this.buildMethod(res[i], res[i + 1]);
    }
  }

  buildFieldsArray(sql) {
    const fields = [];
    const result = sql.matchAll(/\$P{(.+)}/gim);
    const matches = Array.from(result);
    matches.forEach((match) => {
      fields.push(match[1]);
    });
    return fields;
  };

  buildMethod = (sqlMethod, rawSql) => {
    this[sqlMethod] = (params = {}, options={}) => {
      const fields = this.buildFieldsArray(rawSql);
      const sql = rawSql
        .replace(/\$P{.+}/gim, "?")
        .replace(/\n/gm, " ")
        .trim();
      const values = [];
      fields.forEach((fld) => {
        values.push({ [fld]: params[fld] });
      });
      if (options.test) {
        return [sql, values];
      } else {
        return this._provider.execute(sql, values);
      }
    };
  };
}

module.exports = {
  getActiveDb
};
