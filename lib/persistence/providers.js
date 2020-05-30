const mysql = require("mysql");
const mssql = require("mssql");

const MySqlBuilder = require("./sqlbuilder-mysql");
const MsSqlBuilder = require("./sqlbuilder-mssql");

/*==========================================
* Database Provider Super Class
* Implements MySQL Database specs
========================================== */
class DBProvider {
  constructor(builder) {
    this._builder = builder;
  }

  async execute(sql, values = []) {
    return null;
  }

  async list() {
    const [sql, values] = this._builder.list();
    const resultArr = await this.execute(sql, values);
    if (resultArr.length === 0) {
      return [];
    }

    const list = [];
    for (let i = 0; i < resultArr.length; i++) {
      list.push(this.buildData(resultArr[i]));
    }
    return list;
  }

  async first() {
    const [sql, values] = this._builder.first();
    const resultArr = await this.execute(sql, values);
    if (resultArr.length == 0) {
      return null;
    }
    return resultArr[0];
  }

  create(entity) {
    const [sql, values] = this._builder.createEntity(entity);
    return this.execute(sql, values);
  }

  buildData(rawData) {
    const entity = {};
    for (let key in rawData) {
      if (rawData.hasOwnProperty(key)) {
        const field = this._builder.schema.getField(key);
        entity[key] = this._builder.deserializeValue(field, rawData[key]);
      }
    }
    return entity;
  }

  async read(entity) {
    const [sql, values] = this._builder.readEntity(entity);
    const resultArr = await this.execute(sql, values);
    if (resultArr && resultArr.length === 0) {
      return null;
    }
    return this.buildData(resultArr[0]);
  }

  updateEntity(entity) {
    const [sql, values] = this._builder.updateEntity(entity);
    return this.execute(sql, values);
  }

  deleteEntity(entity) {
    const [sql, values] = this._builder.deleteEntity(entity);
    return this.execute(sql, values);
  }

  update(entity) {
    const [sql, values] = this._builder.update(entity);
    return this.execute(sql, values);
  }

  delete() {
    const [sql, values] = this._builder.delete(entity);
    return this.execute(sql, values);
  }

  select(fields) {
    this._builder.select(fields);
    return this;
  }

  find(findBy) {
    this._builder.find(findBy);
    return this;
  }

  where(where) {
    this._builder.where(where);
    return this;
  }

  orderBy(orderBy) {
    this._builder.orderBy(orderBy);
    return this;
  }

  limit(start, limit) {
    this._builder.limit(start, limit);
    return this;
  }

  getPreparedValues(values) {
    const preparedValues = [];
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      preparedValues.push(value.value);
    }
    return preparedValues;
  }
}

/*==========================================
* MySQL Database
========================================== */
class MySqlProvider extends DBProvider {
  constructor(schema, driver, userConf = {}) {
    super(new MySqlBuilder(schema));
    this._driver = driver;

    const defaultConf = {
      connectionLimit: 10,
      host: "localhost",
      port: 3306,
      user: "root",
      password: "1234",
      timeout: 60000,
    };
    this._conf = { ...defaultConf, ...userConf };
  }

  accept(dbType) {
    return dbType === "mysql";
  }

  async connect() {
    this._pool = this._driver.createPool(this._conf);
    console.log("[INFO] Mysql successfully connected.");
  }

  execute(sql, values = []) {
    const preparedValues = this.getPreparedValues(values);
    return new Promise((resolve, reject) => {
      this._pool.query(
        { sql, values: preparedValues, timeout: this._conf.timeout },
        (error, results, fields) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        }
      );
    });
  }

  async close() {
    this._pool.end((err) => {
      if (err) {
        console.log("Error closing connecton pool. ", err.stack);
        return;
      }
      console.log("Pool connections closed.");
    });
  }
}

/*==========================================
* MSSQL Database
========================================== */
class MsSqlProvider extends DBProvider {
  constructor(schema, driver, userConf = {}) {
    super(new MsSqlBuilder(schema));
    this._mssql = driver;

    const defaultConf = {
      host: "localhost",
      port: 1433,
      user: "sa",
      password: "12345",
      enableArithAbort: true,
    };
    this._conf = { ...defaultConf, ...userConf };
  }

  accept(dbType) {
    return dbType === "mssql";
  }

  async connect() {
    const { host, port, user, password, database } = this._conf;
    const connectionStr = `mssql://${user}:${password}@${host}:${port}/${database}`;
    this._pool = new this._mssql.ConnectionPool(connectionStr);
    this._poolConnect = this._pool.connect();
    this._pool.on("error", (err) => {
      console.log("MS SQL server connection error", err);
    });

    await this._poolConnect;
  }

  getDataType(value) {
    let dataType;
    switch (value.type) {
      case "integer":
        return this._mssql.Int;
        break;
      case "decimal":
        return this._mssql.Decimal;
        break;
      default:
        dataType = this._mssql.VarChar;
    }
    return dataType;
  }

  execute(sql, values = []) {
    return new Promise((resolve, reject) => {
      const request = this._pool.request();
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const dataType = this.getDataType(value);
        request.input(value.field, dataType, value.value);
      }
      request.query(sql, (err, result) => {
        if (err) {
          reject(err);
        } else {
          const { recordsets } = result;
          resolve(recordsets[0]);
        }
      });
    });
  }

  async close() {
    await this._pool.close();
    console.log("MS Sql connection closed.");
  }
}

const providers = {
  mysql: { ProviderClass: MySqlProvider, driver: mysql },
  mssql: { ProviderClass: MsSqlProvider, driver: mssql },
};

const getProvider = async (schema, conf) => {
  const provider = providers[conf.dbtype];
  if (!provider) {
    throw `Provider ${conf.dbtype} is not registered.`;
  }
  const { ProviderClass, driver } = provider;
  const db = new ProviderClass(schema, driver, conf);
  await db.connect();
  return db;
};

module.exports = {
  getProvider,
};
