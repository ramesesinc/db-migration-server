const path = require("path");

const db = require("../lib/persistence");

const test = async () => {
  const conf = {
    dbtype: "mysql",
    host: "localhost",
    database: "dbm",
  };
  try {
    const sqlDir = path.join(__dirname, "..", "test", "lib", "persistence", "services");
    const moduleEm = await db.activeDb("dbm", conf, sqlDir);
    await moduleEm.insertModule({name: 'c', dbname: "c", conf: "{}", lasfileid: null})
    await db.close();
  }catch (err) {
    throw err
  }
};

test();
