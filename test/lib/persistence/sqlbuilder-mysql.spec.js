const path = require("path");
const db = require("../../../lib/persistence/schema");
const MySqlBuilder = require("../../../lib/persistence/sqlbuilder-mysql");

let entitySchema;

beforeAll(async () => {
  await db.loadSchema(path.join(__dirname, "services"));
  entitySchema = db.getSchema("entity");
});

describe("DB Schema Builder", () => {
  test("it should load schema entity", () => {
    const entity = db.getSchema("entity");
    expect(entity).toBeDefined();
  });

  test("it should load schema app (recursive) ", () => {
    const app = db.getSchema("app");
    expect(app).toBeDefined();
  });

  test("it should throw error for non-existing schema ", () => {
    expect(() => db.getSchema("noschema")).toThrow();
  });

  test("it should set tablename", () => {
    const entity = db.getSchema("entity");
    expect(entity.tablename).toBe("entity");

    const app = db.getSchema("app");
    expect(app.tablename).toBe("business_application");
  });

  test("it should build schema fields", () => {
    const { fields } = db.getSchema("entity");
    expect(fields.length).toBe(6);
  });

  test("it should set primary key", () => {
    const { fields } = db.getSchema("entity");
    const objid = fields.find((fld) => fld.name === "objid");
    expect(objid.primary).toBe(true);
  });
});

describe("SQL Builder", () => {
  describe("Select SQL Builder", () => {
    test("it should generate select all fields (*) list", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity";
      const [sql, _] = em.list();
      expect(sql).toEqual(expectedSql);
    });

    test("it should generate selective fields list", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT `objid`,`state` FROM entity";
      const [sql, _] = em.select("objid,state").list();
      expect(sql).toEqual(expectedSql);
    });

    test("it should filter list using explicit where clause", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity WHERE `state`='DRAFT'";

      const [sql, _] = em.where([`state='DRAFT'`]).list();
      expect(sql).toEqual(expectedSql);
    });

    test("it should filter list with parameterized where clause", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity WHERE `state` = ? AND `age` > ?";
      const expectedValues = [
        { field: "state", value: "state", type: "string" },
        { field: "age", value: 10, type: 'integer' },
      ];

      const entity = { state: "state", age: 10 };
      const [sql, values] = em
        .where(["state = :state AND age > :age", entity])
        .list();
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should find records by single criterion", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity WHERE `objid`=?";
      const expectedValues = [{field: "objid", value: "id", type: "string" }];

      const [sql, values] = em.find({ objid: "id" }).list();
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should find records by multiple criteria", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity WHERE `state`=? AND `name`=?";
      const expectedValues = [
        { field: "state", value: "state", type: "string" }, 
        { field: "name", value: "name", type: "string" }
      ];

      const [sql, values] = em.find({ state: "state", name: "name" }).list();

      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should limit list result", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity LIMIT 10";
      const [sql, _] = em.limit(10).list();
      expect(sql).toEqual(expectedSql);
    });

    test("it should allow start and limit list selection", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity LIMIT 10,5";
      const [sql, _] = em.limit(10, 5).list();
      expect(sql).toEqual(expectedSql);
    });

    test("it should order list result", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity ORDER BY state, name DESC";
      const [sql, _] = em.orderBy("state, name DESC").list();
      expect(sql).toEqual(expectedSql);
    });

    test("it should select-find-order-limit list result", () => {
      const em = new MySqlBuilder(entitySchema);
      let expectedSql = "SELECT `objid`,`name` FROM entity";
      expectedSql += " WHERE `state`=? AND `age`=?";
      expectedSql += " ORDER BY name, age DESC";
      expectedSql += " LIMIT 10";
      const expectedValues = [
        { field: "state", value: "state", type: "string" }, 
        { field: "age", value: 10, type: "integer" }
      ];

      const [sql, values] = em
        .select("objid,name")
        .find({ state: "state", age: 10 })
        .orderBy("name, age DESC")
        .limit(10)
        .list();

      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should return first record with all fields", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity LIMIT 1";
      const [sql, _] = em.first();
      expect(sql).toEqual(expectedSql);
    });

    test("it should return first record with selective fields", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT `objid`,`state` FROM entity LIMIT 1";
      const [sql, _] = em.select("objid, state").first();
      expect(sql).toEqual(expectedSql);
    });

    test("it should return first record when limit is specified", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity LIMIT 1";
      const [sql, _] = em.limit(10).first();
      expect(sql).toEqual(expectedSql);
    });

    test("it should return first record when ordering is specified", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity ORDER BY name LIMIT 1";
      const [sql, _] = em.orderBy("name").limit(10).first();
      expect(sql).toEqual(expectedSql);
    });

    test("it should return first record when find is specified", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "SELECT * FROM entity WHERE `state`=? LIMIT 1";
      const expectedValues = [{ field: "state", value: "state", type: "string" }];
      const [sql, values] = em.find({ state: "state" }).first();
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should return first record when explicit where is specified", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql =
        "SELECT * FROM entity WHERE `state` = 'DRAFT' LIMIT 1";
      const expectedValues = [];
      const [sql, values] = em.where([`state = 'DRAFT'`]).first();
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should return first record when dynamic where is specified", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql =
        "SELECT * FROM entity WHERE `state` = ? OR `name` LIKE ? LIMIT 1";
      const expectedValues = [
        { field: "state", value: "DRAFT", type: "string" }, 
        { field: "name", value: "name%", type: "string" }
      ];
      const entity = { state: "DRAFT", name: "name%" };
      const [sql, values] = em
        .where(["state = :state OR name LIKE :name", entity])
        .first();
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });
  });

  describe("Update SQL Builder", () => {
    test("it should update single field of all records", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "UPDATE entity SET `state`=?";
      const expectedValues = [{field: "state", value: "DRAFT", type: "string" }];
      const updateInfo = { state: "DRAFT" };
      const [sql, values] = em.update(updateInfo);
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should update multiple fields of all records", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "UPDATE entity SET `state`=?, `salary`=?";
      const expectedValues = [
        { field: "state", value: "DRAFT", type: "string" }, 
        { field: "salary", value: 0, type: "decimal" }
      ];
      const updateInfo = { state: "DRAFT", salary: 0 };
      const [sql, values] = em.update(updateInfo);
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should update records by find with single criterion", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "UPDATE entity SET `state`=? WHERE `state`=?";
      const expectedValues = [
        { field: "state", value: "APPROVED", type: "string" }, 
        { field: "state", value: "DRAFT", type: "string" }
      ];
      const [sql, values] = em
        .find({ state: "DRAFT" })
        .update({ state: "APPROVED" });
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should update records by find with multiple criteria", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql =
        "UPDATE entity SET `state`=? WHERE `state`=? AND `salary`=?";
      const expectedValues = [
        { field: "state", value: "APPROVED", type: "string"},
        { field: "state", value: "DRAFT", type: "string"},
        { field: "salary", value: 12560.45, type: "decimal"},
      ];
      const [sql, values] = em
        .find({ state: "DRAFT", salary: 12560.45 })
        .update({ state: "APPROVED" });
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should update records by explicit where criteria", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "UPDATE entity SET `state`=? WHERE `state` = 'DRAFT'";
      const expectedValues = [{ field: "state", value: "APPROVED", type: "string" }];
      const [sql, values] = em
        .where([`state = 'DRAFT'`])
        .update({ state: "APPROVED" });
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should update records by dynamic where criteria", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql =
        "UPDATE entity SET `state`=? WHERE `state` = ? OR `salary` > ?";
      const expectedValues = [
        { field: "state", value: "APPROVED", type: "string" },
        { field: "state", value: "DRAFT", type: "string" },
        { field: "salary", value: 10000, type: "decimal" },
      ];
      const filter = { state: "DRAFT", salary: 10000 };
      const [sql, values] = em
        .where(["state = :state OR salary > :salary", filter])
        .update({ state: "APPROVED" });
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });
  });

  describe("Delete SQL Builder", () => {
    test("it should allow deletion of all records", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "DELETE FROM entity";
      const [sql, _] = em.delete();
      expect(sql).toEqual(expectedSql);
    });

    test("it should delete records by find with single criterion", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "DELETE FROM entity WHERE `state`=?";
      const expectedValues = [{ field: "state", value: "DRAFT", type: "string" }];
      const entity = { state: "DRAFT" };
      const [sql, values] = em.find(entity).delete();
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should delete records by find with multiple criteria", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "DELETE FROM entity WHERE `state`=? AND `age`=?";
      const expectedValues = [
        { field: "state", value: "DRAFT", type: "string" }, 
        { field: "age", value: 10, type: "integer" }
      ];
      const entity = { state: "DRAFT", age: 10 };
      const [sql, values] = em.find(entity).delete();
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });

    test("it should delete records using explicit where clause", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql =
        "DELETE FROM entity WHERE `state` = 'DRAFT' OR `age` > 50";
      const [sql, _] = em.where([`state = 'DRAFT' OR age > 50`]).delete();
      expect(sql).toEqual(expectedSql);
    });

    test("it should delete records using dynamic where clause", () => {
      const em = new MySqlBuilder(entitySchema);
      const expectedSql = "DELETE FROM entity WHERE `state` = ? OR `age` > ?";
      const expectedValues = [
        { field: "state", value: "DRAFT" , type: "string"}, 
        { field: "age", value: 10, type: "integer" },
      ];
      const entity = { state: "DRAFT", age: 10 };
      const [sql, values] = em
        .where(["state = :state OR age > :age", entity])
        .delete();
      expect(sql).toEqual(expectedSql);
      expect(values).toEqual(expectedValues);
    });
  });
});

describe("Schema CRUD SQL Builder", () => {
  test("it should generate schema read statement", () => {
    const expectedSql = "SELECT * FROM entity WHERE `objid`=?";
    const expectedValues = [{ field: "objid", value: "id", type: "string" }];
    const em = new MySqlBuilder(entitySchema);
    const [sql, values] = em.readEntity({ objid: "id" });
    expect(sql).toEqual(expectedSql);
    expect(values).toEqual(expectedValues);
  });

  test("it should generate schema insert statement", () => {
    const stmts = [];
    stmts.push("INSERT INTO entity");
    stmts.push("(`objid`,`state`,`name`,`age`,`salary`,`birthdate`)");
    stmts.push("VALUES(?,?,?,?,?,?)");
    const expectedSql = stmts.join(" ");

    const bdate = new Date();
    const expectedValues = [
      { field: "objid", value: "id", type: "string"},
      { field: "state", value: "state", type: "string"},
      { field: "name", value: "name", type: "string"},
      { field: "age", value: 20, type: "integer" },
      { field: "salary", value: 1500.5, type: "decimal" },
      { field: "birthdate", value: bdate.toISOString().replace(/\..*/, "").replace("T", " "), type: "date" },
    ];

    const entity = {
      objid: "id",
      state: "state",
      name: "name",
      age: 20,
      salary: 1500.5,
      birthdate: bdate,
    };
    const em = new MySqlBuilder(entitySchema);
    const [sql, values] = em.createEntity(entity);
    expect(sql).toEqual(expectedSql);
    expect(values).toEqual(expectedValues);
  });

  test("it should generate schema update statement", () => {
    const stmts = [];
    stmts.push("UPDATE entity SET");
    stmts.push("`state`=?, `name`=?, `age`=?, `salary`=?, `birthdate`=?");
    stmts.push("WHERE `objid`=?");
    const expectedSql = stmts.join(" ");

    const bdate = new Date();
    const expectedValues = [
      { field: "state", value: "state", type: "string" },
      { field: "name", value: "name", type: "string" },
      { field: "age", value: 20, type: "integer" },
      { field: "salary", value: 1500.5, type: "decimal" },
      { field: "birthdate", value: bdate.toISOString().replace(/\..*/, "").replace("T", " "), type: "date" },
      { field: "objid", value: "id", type: "string" },
    ];

    const entity = {
      objid: "id",
      state: "state",
      name: "name",
      age: 20,
      salary: 1500.5,
      birthdate: bdate,
    };
    const em = new MySqlBuilder(entitySchema);
    const [sql, values] = em.updateEntity(entity);
    expect(sql).toEqual(expectedSql);
    expect(values).toEqual(expectedValues);
  });

  test("it should generate schema delete statement", () => {
    const expectedSql = "DELETE FROM entity WHERE `objid`=?";
    const expectedValues = [{ field: "objid", value: "id", type: "string" }];
    const em = new MySqlBuilder(entitySchema);
    const [sql, values] = em.deleteEntity({ objid: "id" });
    expect(sql).toEqual(expectedSql);
    expect(values).toEqual(expectedValues);
  });
});
