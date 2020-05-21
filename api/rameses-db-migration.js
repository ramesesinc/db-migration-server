const path = require("path");
const fs = require("fs");

const { getHandler } = require("./rameses-migration-handlers");
const { parseEnvFile, log, scanFiles } = require("./rameses-util");
const { getProvider } = require("./rameses-db-providers");
const em = require("./rameses-persistence");

let provider;
let moduleEm;
let migrationEm;

const setProvider = async (dbmConf) => {
  provider = await getProvider(dbmConf.type, dbmConf);
  moduleEm = em.persistence(provider, "dbm_module");
  migrationEm = em.persistence(provider, "dbm_migration");
};

const buildConfFromEnv = files => {
  if (files.length === 0) {
    return {};
  }

  const envFile = files.find(f => /env\.conf/.test(f.file));
  const env = parseEnvFile(path.join(envFile.dir, envFile.file));
  const conf = {
    dbtype: env.db_type,
    host: env.db_host,
    port: env.db_port,
    user: env.db_user,
    password: env.db_pass,
    database: env.db_name,
  }
  if (env.app_server) {
    conf.app_server = env.app_server;
    conf.app_cluster = env.app_cluster;
    conf.app_context = env.app_context;
  }
  return conf;
}

const createModule = async ({ file, fileid, dir, files }) => {
  const conf = buildConfFromEnv(files);
  let module = await moduleEm.select("name").find({ name: file }).first();
  if (!module) {
    module = {
      name: file,
      dbname: conf.database || file,
      dir,
      fileid,
      conf,
      lastfileid: null,
    };
    await moduleEm.create(module);
  } else {
    module.conf = conf;
    moduleEm.update(module);
  }
  return module;
};

const loadModuleFiles = async (module, moduleFile, submodule = {}) => {
  await saveMigrationFiles(module, submodule, moduleFile.files);
  for (let i = 0; i < moduleFile.modules.length; i++) {
    const submod = moduleFile.modules[i];
    await loadModuleFiles(module, moduleFile.modules[i], submod);
  }
};

const loadModule = async (moduleFile) => {
  const module = await createModule(moduleFile);
  await loadModuleFiles(module, moduleFile);
};

const reloadModule = async (moduleName) => {
  const dbmRoot = global.gConfig.dbm_root;
  const moduleFilter = (file) => file.name === moduleName;
  const moduleFiles = await scanModules(dbmRoot, moduleFilter);
  if (moduleFiles) {
    loadModule(moduleFiles[0]);
  }
}

const loadModules = async () => {
  const dbmRoot = global.gConfig.dbm_root;
  const moduleFiles = await scanModules(dbmRoot);
  for (let i = 0; i < moduleFiles.length; i++) {
    await loadModule(moduleFiles[i]);
  }
};


const updateModule = async (module) => {
  await moduleEm.update(module);
  return module;
};

const isFileSaved = async (module, file) => {
  const params = {
    parentid: module.name,
    filename: file.file,
  };
  const migration = await migrationEm.select("parentid").find(params).first();
  return migration ? true : false;
};

const createMigrationFile = async (module, submodule, file) => {
  const migrationFile = {
    parentid: module.fileid || module.name,
    filename: file.file,
    modulename: submodule.file,
    file: path.join(file.dir, file.file),
    dtfiled: new Date(),
    errors: null,
    state: 0,
  };
  await migrationEm.create(migrationFile);
  log.info(`${module.fileid || module.name} file: ${migrationFile.filename} saved.`);
};

const saveMigrationFiles = async (module, submodule, files) => {
  const migrationFiles = files.filter(f => !f.file.endsWith(".conf"))
  for (let i = 0; i < migrationFiles.length; i++) {
    const file = migrationFiles[i];
    const fileSaved = await isFileSaved(module, file);
    if (!fileSaved) {
      await createMigrationFile(module, submodule, file);
    }
  }
};

const getModules = () => {
  return moduleEm.orderBy("name").list();
};

const getModule = (name) => {
  return moduleEm.read({ name });
};

const updateFile = (file) => {
  return migrationEm.update(file)
};

const sort = (list, field) => {
  list.sort((a, b) => {
    const afile = a[field];
    const bfile = b[field];
    if (afile < bfile) return -1;
    if (afile > bfile) return 1;
    return 0;
  });
};

/*=================================
 * returns a list of objects
 *   [
 *     {name: "module1": files:[]},
 *     {name: "module2": files:[]},
 *   ]
==================================*/
const getModuleFiles = async (module) => {
  const files = await migrationEm
    .find({ parentid: module.name })
    .orderBy("parentid,modulename,filename")
    .list();

  const moduleNames = [...new Set(files.map((file) => file.modulename))];
  const list = moduleNames.map(mn => {
    return {modulename: mn, name: mn || module.name, files: []}
  });

  list.forEach(item => {
    item.files = files.filter(f => f.modulename === item.modulename);
  })

  return list;
};

const buildModules = async () => {
  const modules = [];
  const keys = await keysAsync(`${MODULE_KEY_PREFIX}:*`);
  for (let i = 0; i < keys.length; i++) {
    modules.push(await readData(keys[i]));
  }
  for (let i = 0; i < modules.length; i++) {
    await buildModule(modules[i]);
  }
};

const getModuleFileConf = async (file) => {
  let conf = {}
  if (file.modulename) {
    const module = await moduleEm.read({name: file.modulename});
    if (module) {
      conf = module.conf;
    }
  }
  return conf;
};

const updateStatusCallback = async (status, file) => {
  if (status === "OK") {
    module.lastfileid = file.filename;
    await updateModule(module);
  } else if (status === "DONE") {
    module.lastfileid = file.filename;
    await updateModule(module);
    file.state = 1;
    await updateFile(file);
  } else {
    file.errors = status.error;
    file.state = 1;
    await updateFile(file);
  }
}

const getUnprocessedFiles = async (module) => {
  const files = await migrationEm
  .where(['parentid = :name AND state = 0', module])
  .orderBy('modulename,filename')
  .list();

  /* build sql and svc files */
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    file.conf = await getModuleFileConf(file);
    file.conf = file.conf || module.conf;
    file.modulename = file.modulename || module.name;
  };
  
  const unprocessedFiles = files.filter(f => f.filename.indexOf("mssql") === -1)
  const nonMySqlFiles = files.filter(f => f.dbtype === 'mssql' && f.filename.indexOf("mssql") > 0 )

  const replacements = []
  nonMySqlFiles.forEach((nf, replacementIdx) => {
     const name = nf.filename.replace("_mssql.sql","");
     const idx = unprocessedFiles.findIndex(f => nf.modulename === f.modulename && f.filename.startsWith(name));
    replacements.push([idx, replacementIdx])
  });
  
  replacements.forEach( r => {
    unprocessedFiles[r[0]] = nonMySqlFiles[r[1]];
  });

  return unprocessedFiles;
}

const buildModule = async (module) => {
  log.info(`Building module ${module.name}`);
  const unprocessedFiles = await getUnprocessedFiles(module);
  for (let i = 0; i < unprocessedFiles.length; i++) {
    try {
      const file = unprocessedFiles[i];
      file.conf = await getModuleFileConf(file);
      const handler = await getHandler(module, file);
      log.info(`Processing file ${file.filename}`);
      await handler.execute(module, file, updateStatusCallback);
      await handler.close();
    } catch (err) {
      log.err(err);
      break;
    }
  }
};

const initModule = (parent, dir, file) => {
  return {
    dir,
    file: file.name,
    fileid: parent ? `${parent.file}.${file.name}` : file.name,
    files: [],
    modules: [],
  };
};

const initFile = (dir, file) => {
  return { file: file.name, dir };
};

const scanModuleFiles = async (dir, parent) => {
  const files = await scanFiles(dir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.isDirectory()) {
      let parentDir;
      if (/migrations/i.test(file.name)) {
        parentDir = path.join(dir, "migrations");
        await scanModuleFiles(parentDir, parent);
      } else {
        const module = initModule(parent, dir, file);
        parent.modules.push(module);
        parentDir = path.join(dir, file.name);
        await scanModuleFiles(parentDir, module);
      }
    } else {
      parent.files.push(initFile(dir, file));
    }
  }
};

const scanModules = async (dir, filter = (file) => {return true}) => {
  const modules = [];
  const files = await scanFiles(dir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.isDirectory() && filter(file)) {
      const module = initModule(null, dir, file);
      modules.push(module);
      const parentDir = path.join(dir, file.name);
      await scanModuleFiles(parentDir, module);
    } 
  }
  return modules;
};

const initialize = async (servicePath) => {
  const dbmConf = {
    type: process.env.dbm_db_type || "mysql",
    host: process.env.dbm_db_host || "localhost",
    user: process.env.dbm_db_user || "root",
    password: process.env.dbm_db_pass || "1234",
    database: process.env.dbm_db_name || "dbm",
  }

  try {
    await em.loadResources(servicePath);
    await setProvider(dbmConf);
    await loadModules();
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  initialize,
  buildModule,
  buildModules,
  getModule,
  getModules,
  getModuleFiles,
  loadModules,
  updateFile,
  updateModule,
  reloadModule,
  setProvider,
  scanModules,
};
