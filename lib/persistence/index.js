const path = require("path");
const { loadSchema, getSchema } = require("./schema");
const { getActiveDb } = require("./sqlactivedb");
const { getProvider } = require("./providers");

let servicesDir;

const loadServices = async (dir) => {
  servicesDir = dir;
  await loadSchema(path.join(servicesDir, "schema"));
};


const openProviders = [];

const persistence = async (schemaName, dataSource) => {
  const schema = getSchema(schemaName);
  const provider = await getProvider(schema, dataSource);
  openProviders.push(provider);
  return provider;
};

const activeDb = async (sqlName, dataSource, dir) => {
  const provider = await getProvider(null, dataSource);
  openProviders.push(provider);
  const sqlDir = path.join(dir || servicesDir, "sql");
  return getActiveDb(sqlName, sqlDir, provider);
};

const close = () => {
  return Promise.all(openProviders.map((p) => p.close())).then(() =>
    console.log("Database connections closed.")
  );
};

module.exports = {
  loadServices,
  persistence,
  activeDb,
  close,
  getProvider,
};
