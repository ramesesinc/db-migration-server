const fs = require("fs");
const mysql = require("mysql");
const mssql = require("mssql");
const fetch = require("node-fetch");


const  getUserConf = (module, file, confType) => {
  let moduleConf;
  if (file.submodule) {
    moduleConf = module.conf[file.submodule] || {};
  } else {
    moduleConf = module.conf || {};
  }
  return moduleConf[confType] || {};
};


/*=====================================
* MYSQL Handler
=====================================*/
const mysqlHandler = (function () {
  this.pool;

  const accept = async (module, file) => {
    if (/.+\.mysql$/i.test(file.filename)) {
      await createPool(module, file);
      return true;
    }
    return false;
  };

  const createPool = async (module, file) => {
    const defaultConf = {
      connectionLimit: 10,
      host: "localhost",
      port: 3306,
      user: "root",
      password: "1234",
      database: module.dbname,
    };

    const userConf = getUserConf(module, file, "mysql");
    const conf = { ...defaultConf, ...userConf };

    this.pool = mysql.createPool({
      connectionLimit: conf.poolSize,
      host: conf.host,
      port: conf.port,
      user: conf.user,
      password: conf.password,
      database: conf.database,
    });
  };

  const close = async () => {
    this.pool.end((err) => {
      if (err) {
        console.log("Error closing connecton pool. ", err.stack);
        return;
      }
      console.log("Pool connections closed.");
    });
  };

  const query = (sql, values = []) => {
    return new Promise((resolve, reject) => {
      this.pool.query(
        { sql, values, timeout: this.timeout },
        (error, results, fields) => {
          if (error) {
            reject(error);
          } else {
            resolve([results, fields]);
          }
        }
      );
    });
  };

  const execute = async (module, file, callback) => {
    const sqlFile = fs.readFileSync(file.file).toString();
    const sqls = sqlFile.split(/;$/gim);
    for (let i = 0; i < sqls.length; i++) {
      const sql = sqls[i].trim();
      if (sql.length > 0 && !sql.startsWith("#")) {
        try {
          await query(sql);
          await callback({status: "OK"}, file);
        } catch (error) {
          await callback({status: "ERROR", error: error.sqlMessage}, file);
          throw error;
        }
      }
    }
    await callback("DONE", file);
  };

  return {
    accept,
    close,
    execute,
    query,
  };
})();

/*=====================================
* MSSQL Handler
=====================================*/
const mssqlHandler = (function () {
  const accept = async (module, file) => {
    if (/.+\.mssql$/i.test(file.filename)) {
      await createConnection(module, file);
      return true;
    }
    return false;
  };

  const createConnection = async (module, file) => {
    const defaultConf = {
      host: "localhost",
      port: 1433,
      user: "sa",
      password: "12345",
      database: module.dbname,
      enableArithAbort: true,
    };

    const userConf = getUserConf(module, file, "mssql");
    const conf = { ...defaultConf, ...userConf };
    const { host, port, user, password, database } = conf;

    const connectionStr = `mssql://${user}:${password}@${host}:${port}/${database}`;
    await mssql.connect(connectionStr);
    console.log(`[INFO] MSSQL Server connection successfully established`);
  };

  const close = async () => {
    //
  };

  const query = async (sql, values = []) => {
    const result = await mssql.query(sql);
    const { recordsets } = result;
    return [recordsets, []];
  };

  const execute = async (module, file, callback) => {
    const sqlFile = fs.readFileSync(file.file).toString();
    const sqls = sqlFile.split(/;$/gim);
    for (let i = 0; i < sqls.length; i++) {
      const sql = sqls[i].trim();
      if (sql.length > 0 && !sql.startsWith('#')) {
        try {
          await query(sql);
          await callback({status: "OK"}, file);
        } catch (error) {
          await callback({status: "ERROR", error}, file);
          throw error;
        }
      }
    }
    await callback("DONE", file);
  };

  return {
    accept,
    close,
    execute,
    query,
  };
})();

/*=====================================
* Service Handler
=====================================*/
const serviceHandler = (function () {
  const accept = async (module, file) => {
    if (/.+\.svc$/i.test(file.filename)) {
      await createConnection(module, file);
      return true;
    }
    return false;
  };

  const createConnection = async (module, file) => {
    const defaultConf = {
      host: "localhost:8070",
      cluster: "osiris3",
      context: "etracs25",
    };

    const userConf = getUserConf(module, file, "svc");
    const conf = { ...defaultConf, ...userConf };
    const { host, cluster, context, service } = conf;

    this.url = `http://${host}/${cluster}/json/${context}`;
    console.log(`[INFO] Service connection initialized`);
    console.log(`[INFO]    ${this.url}`);
  };

  const close = async () => {
    //
  };

  const invokeService = async (service) => {
    const serviceUrl = `${this.url}/${service}`;
    const res = await fetch(serviceUrl);
    if (res.ok) {
      try {
        const data = await res.json();
        if (data.status !== 'OK') {
          throw `${data.error}`;
        }
      } catch (err) {
        throw `Error executing service. ${err}`;
      }
    } else {
      throw res.statusText;
    }
  };

  const execute = async (module, file, callback) => {
    const serviceFile = fs.readFileSync(file.file).toString();
    const services = serviceFile.split(/;$/gim);
    for (let i = 0; i < services.length; i++) {
      const service = services[i].trim();
      if (service.length > 0 && !service.startsWith("#")) {
        try {
          await invokeService(service);
          await callback({status: "OK"}, file);
        } catch (error) {
          await callback({status: "ERROR", error }, file);
          throw error;
        }
      }
    }
    await callback("DONE", file);
  };

  return {
    accept,
    close,
    execute,
  };
})();

const handlers = [mysqlHandler, mssqlHandler, serviceHandler];

const getHandler = async (module, file) => {
  for (let i = 0; i < handlers.length; i++) {
    const handler = handlers[i];
    const accepted = await handler.accept(module, file);
    if (accepted) {
      return handler;
    }
  }
  throw `Handler for file ${file} is not registered.`;
};

module.exports = {
  getHandler,
};
