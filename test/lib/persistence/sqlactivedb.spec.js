const path = require("path");
const db = require("../../../lib/persistence");

let entityEm;

const conf = {
  connectionLimit: 10,
  dbtype: "mysql",
  host: "localhost",
  port: 3306,
  user: "root",
  password: "1234",
  timeout: 60000,
  database: "etracs255_talibon",
};

beforeAll(async () => {
  await db.loadServices(path.join(__dirname, "services"));
  entityEm = await db.activeDb("entity", conf);
});

describe("SQL File Executor", () => {
  test("it should throw error for unregistered executor", async () => {
    try {
      await db.activeDb("dummy", conf);
    } catch(err) {
      expect(err).toMatch("does not exist");
    }
  });

  test("it should generate list of all records", async () => {
    const expectedSql = "SELECT * FROM entity";
    const [sql, _] = entityEm.getList({}, {test: true});
    expect(sql).toEqual(expectedSql);
  });

  test("it should generate filtered list", () => {
    const expectedSql = "SELECT * FROM entity WHERE state = ? AND name LIKE ?";
    const expectedValues = [{ state: "DRAFT" }, { searchtext: "JUAN%" }];
    const [sql, values] = entityEm.getFilteredList({
      state: "DRAFT",
      searchtext: "JUAN%",
    }, {test: true});
    expect(sql).toEqual(expectedSql);
    expect(values).toEqual(expectedValues);
  });

  test("it should generate update without filter", () => {
    const expectedSql = "UPDATE entity SET state = ?";
    const expectedValues = [{ state: "DRAFT" }];
    const [sql, values] = entityEm.updateState({ state: "DRAFT" }, {test: true});
    expect(sql).toEqual(expectedSql);
    expect(values).toEqual(expectedValues);
  });

  test("it should generate update with filter", () => {
    const expectedSql =
      "UPDATE entity SET state = ? WHERE state = ? AND age > ?";
    const expectedValues = [
      { state: "APPROVED" },
      { draft: "DRAFT" },
      { age: 50 },
    ];
    const [sql, values] = entityEm.approve({
      state: "APPROVED",
      draft: "DRAFT",
      age: 50,
    }, {test: true});
    expect(sql).toEqual(expectedSql);
    expect(values).toEqual(expectedValues);
  });
});
