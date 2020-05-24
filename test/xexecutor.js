const path = require("path");

const db = require("../lib/database");

const test = async () => {
  const conf = {
    dbtype: "mysql",
    host: "192.168.1.8",
    database: "dbm",
  };
  try {
    const sqlDir = path.join(__dirname, "..", "test", "lib", "persistence", "services");
    const moduleEm = await db.activeDb("dbm", conf, sqlDir);
    await moduleEm.insertModule({name: 'b', dbname: "b", conf: "{}", lasfileid: null})
    await db.close();
  }catch (err) {
    throw err
  }
};

test();
