const mysql = require("mysql");
const mssql = require("mssql");


/*==========================================
* MySQL Database
========================================== */
class MySqlProvider  {
  constructor(mysql, userConf = {}) {
    this.name = "mysql";
    this.mysql = mysql;

    const defaultConf = {
      connectionLimit: 10,
      host: "localhost",
      port: 3306,
      user: "root",
      password: "1234",
      timeout: 60000,
    };
    this.conf = {...defaultConf, ...userConf};
  }

  accept(dbType) {
    return dbType === this.name;
  }

  async connect() {
    this.pool = this.mysql.createPool(this.conf);
    console.log("[INFO] Mysql successfully connected.");
  }

  async execute(sql, values = []) {
    const queryPromise = new Promise((resolve, reject) => {
      this.pool.query(
        { sql, values, timeout: this.conf.timeout},
        (error, results, fields) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        }
      );
    });
    return await queryPromise;
  }

  async close() {
    this.pool.end((err) => {
      if (err) {
        console.log("Error closing connecton pool. ", err.stack);
        return;
      }
      console.log("Pool connections closed.");
    });
  };

}



/*==========================================
* MSSQL Database
========================================== */
class MsSqlProvider  {
  constructor(mssql, userConf = {}) {
    this.name = "mssql";
    this.mssql = mssql;

    const defaultConf = {
      host: "localhost",
      port: 1433,
      user: "sa",
      password: "12345",
      enableArithAbort: true,
    };
    this.conf = {...defaultConf, ...userConf};
  }

  accept(dbType) {
    return dbType === this.name;
  }

  async connect() {
    const { host, port, user, password, database } = this.conf;

    const connectionStr = `mssql://${user}:${password}@${host}:${port}/${database}`;
    await this.mssql.connect(connectionStr);
    console.log(`[INFO] MSSQL Server connection successfully established`);

    this.mssql.on("error", err => {
      console.log("[ERROR] MSSql Server connection error.", err);
    });
  };

  async execute(sql, values = []) {
    const result = await mssql.query(sql);
    const { recordsets } = result;
    return recordsets[0];
  }

  async close() {
    await this.mssql.close();
    console.log("MS Sql connection closed.");
  };
}

const providers = {
  mysql: { ProviderClass: MySqlProvider, driver: mysql},
  mssql: { ProviderClass: MsSqlProvider, driver: mssql},
}

const getProvider = async (type, userConf) => {
  const provider = providers[type];
  if (!provider) {
    throw `Provider ${type} is not registered.`;
  }
  const { ProviderClass, driver } = provider;
  const db = new ProviderClass(driver, userConf);
  await db.connect();
  return db;
}

module.exports = {
  getProvider
}