const path = require("path");

const db = require("../lib/database");

const createModule = async () => {
  const conf = {
    dbtype: "mysql",
    host: "192.168.1.8",
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
