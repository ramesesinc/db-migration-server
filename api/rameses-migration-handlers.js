const fs = require("fs");
const fetch = require("node-fetch");
const { getProvider } = require("../lib/persistence");

class Handler {
  constructor() {
    this._provider = null;
  }

  getModuleConf(module, file) {
    if (file.modulename) {
      return file.conf;
    } 
    return module.conf;
  }

  async accept(module, file) {
    return false;
  }

  async execute(sql, values=[]) {
    if (this._provider) {
      return await this._provider.execute(sql, values);
    }
  }

  async handle(module, file, callback) {
    const sqlFile = fs.readFileSync(file.file).toString();
    const sqls = sqlFile.split(/;$/gim);
    let hasError = false;
    for (let i = 0; i < sqls.length; i++) {
      const sql = sqls[i].trim();
      if (sql.length > 0 && !sql.startsWith("#")) {
        try {
          await this.execute(sql);
          await callback({status: "OK", module, file});
        } catch (error) {
          hasError = true;
          await callback({status: "ERROR", error: error, module, file});
          break;
        }
      }
    }
    await callback({status: "DONE", module, file});
    if (hasError) {
      throw `Encountered an error while processing ${module.name}`;
    }
  };

  async close() {
    if (this._provider) {
      await this._provider.close();
    }
  }
}

/*=====================================
* MYSQL Handler
=====================================*/
class MySqlHandler extends Handler {
  async accept(module, file) {
    const conf = this.getModuleConf(module, file);
    if (conf.dbtype !== "mysql") {
      return false;
    }
    if (/.+\.sql$/i.test(file.filename)) {
      this._provider = await getProvider(null, conf);
      return true;
    }
    return false;
  }
}


/*=====================================
* MSSQL Handler
=====================================*/
class MsSqlHandler extends Handler {
  async accept(module, file) {
    const conf = this.getModuleConf(module, file);
    if (conf.dbtype !== "mssql") {
      return false;
    }

    if (/.+\.sql$/i.test(file.filename)) {
      this._provider = await getProvider(null, conf);
      return true;
    }
    return false;
  };
}

/*=====================================
* Service Handler
=====================================*/
class ServiceHandler extends Handler {
  async accept(module, file) {
    const conf = this.getModuleConf(module, file);
    if (/.+\.svc$/i.test(file.filename)) {
      this.createConnection(module, file, conf);
      return true;
    }
    return false;
  };

  createConnection (module, file, conf) {
    const host = conf.app_server;
    const cluster = conf.app_cluster;
    const context = conf.app_context;

    this.url = `http://${host}/${cluster}/json/${context}`;
    console.log(`[INFO] Service connection initialized`);
    console.log(`[INFO]    ${this.url}`);
  };

  async invokeService(service) {
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

  async handle(module, file, callback) {
    const serviceFile = fs.readFileSync(file.file).toString();
    const services = serviceFile.split(/;$/gim);
    for (let i = 0; i < services.length; i++) {
      const service = services[i].trim();
      if (service.length > 0 && !service.startsWith("#")) {
        try {
          await this.invokeService(service);
          await callback({status: "OK", module, file});
        } catch (error) {
          await callback({status: "ERROR", error, module, file });
          break;
        }
      }
    }
    await callback({status: "DONE", module, file});
  }
}

const handlers = [
  new MySqlHandler(), 
  new MsSqlHandler(), 
  new ServiceHandler()
];

const getHandler = async (module, file) => {
  for (let i = 0; i < handlers.length; i++) {
    const handler = handlers[i];
    const accepted = await handler.accept(module, file);
    if (accepted) {
      return handler;
    }
  }
  throw `Handler for file ${file.filename} is not registered.`;
};

module.exports = {
  getHandler,
};
