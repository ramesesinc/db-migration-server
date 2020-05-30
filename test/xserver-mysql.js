const path = require("path");

const db = require("../lib/persistence");

const createModule = async () => {
  const conf = {
    dbtype: "mysql",
    host: "localhost",
    database: "dbm",
  };
  try {
    const moduleEm = await db.persistence("dbm_module", conf);
    console.log("LIST", await moduleEm.list());
  }catch (err) {
    throw err
  }
};

const test = async () => {
  try {
    await db.loadServices(path.join(__dirname, "..", "services"));
    await createModule();
    await db.close();
  } catch (err) {
    console.log(err)
  }
};

test();
