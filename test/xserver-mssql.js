const path = require("path");

const db = require("../lib/database");

const createModule = async () => {
  const conf = {
    dbtype: "mssql",
    host: "192.168.1.7",
    database: "dbm",
    user: 'sa',
    password: '12345'
  };
  try {
    const moduleEm = await db.persistence("dbm_module", conf);
    // console.log("LIST", await moduleEm.list());
    console.log("LIST", await moduleEm.create({
      name: 'waterworks4',
      dbname: 'waterworks4',
      conf: {},
      lastfileid: null,
      version: 1.11
    }));
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
