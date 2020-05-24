const path = require("path");
const schema = require("../../../lib/persistence/schema")

beforeAll(async () => {
  await schema.loadSchema(path.join(__dirname, "services"));
})

describe("Schema Builder", () => {
  test("should load entity", () => {
    const entity = schema.getSchema("entity");
    expect(entity).not.toBeNull();
    expect(entity.fields.length).toEqual(6);
  });

  test("should load app (recursive)", () => {
    const app = schema.getSchema("app");
    expect(app).not.toBeNull();
    expect(app.fields.length).toEqual(2);
  });

  test("should throw error for unregisted schema", () => {
    expect(() => schema.getSchema("dummy")).toThrow();
  });
});