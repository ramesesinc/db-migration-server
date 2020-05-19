const path = require("path");
const { promisify } = require("util");
const redis = require("redis");

const cache = redis.createClient(global.gConfig.redis_url);

cache.on("connect", () => {
  log.info("Cache successfully started")
})

cache.on("reconnecting", () => {
  log.info("Cache is restarting")
})

cache.on("error", err => {
  log.err(`Cache encountered error: ${err}`);
});


const getAsync = promisify(cache.get).bind(cache);
const setAsync = promisify(cache.set).bind(cache);
const keysAsync = promisify(cache.keys).bind(cache);

const { getHandler } = require("./rameses-migration-handlers");
const { log, scanFiles } = require("./rameses-util");

const closeCache = () => {
  cache.unref();
  cache.end(true);
};

const readData = async (key) => {
  let data = await getAsync(key);
  if (data) {
    try {
      data = JSON.parse(data);
    } catch (err) {
      log.err(`Unable to parse data for key ${key}`);
    }
  }
  return data;
};

const saveData = async (key, data) => {
  try {
    await setAsync(key, JSON.stringify(data));
  } catch (err) {
    const errMsg = `Unable to parse data for key ${key}`;
    log.err(errMsg);
    throw errMsg;
  }
};

const MODULE_KEY_PREFIX = "MODULE";
const FILE_KEY_PREFIX = "FILE";

const getModuleKey = (module) => {
  return `${MODULE_KEY_PREFIX}:${module.fileid}`;
};

const getModuleFileKey = (module, file) => {
  if (file.submodule) {
    return `${FILE_KEY_PREFIX}:${module.fileid}:${file.submodule}:${file.filename}`;
  }
  return `${FILE_KEY_PREFIX}:${module.fileid}:${file.filename}`;
};

const getMysqlConf = dbname => {
  const conf = {
    host: "localhost",
    user: "root",
    password: "1234",
  }
  if (dbname) {
    conf.database = dbname;
  }
  return conf;
}

const getMsSqlConf = dbname => {
  const conf =  {
    host: "localhost",
    user: "sa",
    password: "12345",
  }
  if (dbname) {
    conf.database = dbname;
  }
  return conf;
}

const getServiceConf = dbname => {
  return {
    host: "localhost:8070",
    cluster: "osiris3",
    context: "etracs25",
  }
}

const getDefaultConf = (extName, dbname) => {
  const confs = {
    mysql: getMysqlConf(dbname),
    mssql: getMsSqlConf(dbname),
    svc: getServiceConf(dbname),
  }
  return confs[extName];
}

const createModule = async ({ file, fileid, dir }) => {
  let module = await readData(getModuleKey({fileid}));
  if (!module) {
    module = {
      name: file,
      dbname: file,
      dir,
      fileid,
      lastfileid: null,
      conf: {},
    };
    await saveModule(module);
  }
  return module;
};

const registerSubModuleConf = async (module, submod, extName) => {
  let subModuleConf = module.conf[submod.file];
  if (!subModuleConf) {
    subModuleConf = {};
    module.conf[submod.file] = subModuleConf;
  }
  let conf = subModuleConf[extName];
  if ( !conf ) {
    conf = getDefaultConf(extName, submod.file);
    subModuleConf[extName] = conf;
    updateModule(module);
  }
};

const registerConf = async (module, submod, file) => {
  const extName = path.extname(file.file).replace(".", "");
  if (submod.file) {
    await registerSubModuleConf(module, submod, extName);
  } else {
    if (!module.conf[extName]) {
      module.conf[extName] = getDefaultConf(extName, module.name);
      await updateModule(module);
    }
  }
};

const loadModuleFiles = async (module, moduleFile, submodule = {}) => {
  await saveModuleFiles(module, submodule, moduleFile.files);
  for (let i = 0; i < moduleFile.modules.length; i++) {
    const submod = moduleFile.modules[i];
    await loadModuleFiles(module, moduleFile.modules[i], submod);
  }
};

const loadModules = async () => {
  const dbmRoot = global.gConfig.dbm_root;
  const moduleFiles = await scanModules(dbmRoot);
  for (let i = 0; i < moduleFiles.length; i++) {
    const moduleFile = moduleFiles[i];
    const module = await createModule(moduleFile);
    await loadModuleFiles(module, moduleFile);
  }
};

const saveModule = async (newModule) => {
  const moduleKey = getModuleKey(newModule);
  let module = await readData(moduleKey);
  if (!module) {
    await saveData(moduleKey, newModule);
    module = newModule;
  }
  log.info(`${module.name} saved.`);
};

const updateModule = async (module) => {
  await saveData(getModuleKey(module), module);
  return module;
};

const isFileSaved = async (fileKey) => {
  const file = await readData(fileKey);
  return file ? true : false;
};

const createModuleFile = async (module, submodule, file, fileKey) => {
  const modFile = {
    parentid: module.fileid,
    submodule: submodule.file || "",
    filename: file.file,
    file: path.join(file.dir, file.file),
    dtfiled: new Date().toISOString(),
    errors: null,
    state: 0,
  };
  await saveData(fileKey, modFile);
  log.info(`${module.fileid} file: ${modFile.filename} saved.`);
};

const saveModuleFiles = async (module, submodule, files) => {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    await registerConf(module, submodule, file);

    const modFileKey = getModuleFileKey(module, {
      filename: file.file,
      submodule: submodule.file,
    });
    const fileSaved = await isFileSaved(modFileKey);
    if (!fileSaved) {
      await createModuleFile(module, submodule, file, modFileKey);
    }
  }
};

const getModules = async () => {
  const modules = [];
  const keys = await keysAsync(`${MODULE_KEY_PREFIX}*`);
  for (let i = 0; i < keys.length; i++) {
    const moduleJson = await getAsync(keys[i]);
    modules.push(JSON.parse(moduleJson));
  }
  modules.sort((a, b) => {
    const aname = a.name.toLowerCase();
    const bname = b.name.toLowerCase();
    if (aname < b.name) return -1;
    if (aname > b.name) return 1;
    return 0;
  });
  return modules;
};

const getModule = async (moduleName) => {
  const jsonModule = await getAsync(getModuleKey({ fileid: moduleName }));
  let module;
  if (jsonModule) {
    module = JSON.parse(jsonModule);
  }
  return module;
};

const updateFile = async (module, file) => {
  const modFileKey = getModuleFileKey(module, file);
  await saveData(modFileKey, file);
};


const sort = (list, field) => {
  list.sort((a, b) => {
    const afile = a[field];
    const bfile = b[field];
    if (afile < bfile) return -1;
    if (afile > bfile) return 1;
    return 0;
  })
}

/*=================================
 * returns a list of objects
 *   [
 *     {name: "module1": files:[]},
 *     {name: "module2": files:[]},
 *   ]
==================================*/
const getModuleFiles = async (module) => {
  const files = [];
  const keys = await keysAsync(`${FILE_KEY_PREFIX}:${module.fileid}:*`);
  for (let i = 0; i < keys.length; i++) {
    files.push(await readData(keys[i]));
  }
  
  const mainFiles = [];
  const subfiles = {};

  files.forEach(file => {
    file.dtfiled = new Date(file.dtfiled);
    if (file.submodule.length === 0) {
      mainFiles.push(file);
    } else {
      if (!subfiles[file.submodule]) {
        subfiles[file.submodule] = [];
      }
      subfiles[file.submodule].push(file);
    }
  })

  const resultList = [];
  sort(mainFiles, "filename");
  resultList.push({name: module.name, files: mainFiles});

  const subKeys = Object.keys(subfiles).sort();
  subKeys.forEach(key => {
    if (subfiles.hasOwnProperty(key)) {
      const submodules = subfiles[key];
      sort(submodules, "filename");
      resultList.push({name: key, files: submodules})
    }
  });
  return resultList;
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

const buildModule = async (module) => {
  log.info(`Building module ${module.name}`);
  
  const moduleFiles = await getModuleFiles(module);
  const files = [];
  moduleFiles.forEach(mf => {
    files.push(...mf.files);
  });

  const unprocessedFiles = files.filter((file) => file.state === 0);
  for (let i = 0; i < unprocessedFiles.length; i++) {
    try {
      const file = unprocessedFiles[i];
      const handler = await getHandler(module, file);
      log.info(`Processing file ${file.filename}`);
      await handler.execute(module, file, async (status, file) => {
        if (status === "OK") {
          module.lastfileid = file.filename;
          await updateModule(module);
        } else if (status === "DONE") {
          module.lastfileid = file.filename;
          await updateModule(module);
          file.state = 1;
          await updateFile(module, file);
        } else {
          file.errors = status.error;
          file.state = 1;
          updateFile(module, file);
        }
      });
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

const scanModules = async (dir) => {
  const modules = [];
  const files = await scanFiles(dir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.isDirectory()) {
      const module = initModule(null, dir, file);
      modules.push(module);
      const parentDir = path.join(dir, file.name);
      await scanModuleFiles(parentDir, module);
    } else {
      module.files.push({
        dir: dir,
        file: file.name,
      });
    }
  }
  return modules;
};

module.exports = {
  buildModule,
  buildModules,
  closeCache,
  getModule,
  getModules,
  getModuleFiles,
  loadModules,
  updateFile,
  updateModule,
  scanModules,
};
