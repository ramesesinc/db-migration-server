const path = require("path");
const config = require("../config/config");
const api = require("../api/rameses-db-migration");

const rootDir = path.join(__dirname, "dbm-root");

afterAll(() => {
  console.log("afterAll")
  api.closeCache();
});

describe("DB Migration", () => {
  test("should load single level module", async () => {
    const expectedModules = [
      { file: "module1", 
        fileid: "module1",
        dir: `${rootDir}/single`,
        files: [
          {file: "1-init.mysql", dir: `${rootDir}/single/module1/migrations`},
          {file: "2-update.mysql", dir: `${rootDir}/single/module1/migrations`},
        ],
        modules: [],
      }
    ];
    const modules = await api.scanModules(path.join(rootDir, "single"));
    expect(modules).toEqual(expectedModules);
  });

  test("should load multi-level modules", async () => {
    const expectedModules = [
      { file: "module1", 
        fileid: "module1",
        dir: `${rootDir}/multiple`,
        files: [
          {file: "1-init.mysql", dir: `${rootDir}/multiple/module1/migrations`},
          {file: "2-update.mysql", dir: `${rootDir}/multiple/module1/migrations`},
        ],
        modules: [
          {
            file: "submodule1",
            fileid: "module1.submodule1",
            dir: `${rootDir}/multiple/module1/migrations`,
            files: [
              {file: "1-init.mysql", dir: `${rootDir}/multiple/module1/migrations/submodule1`},
              {file: "2-update.mysql", dir: `${rootDir}/multiple/module1/migrations/submodule1`},
            ],
            modules: []
          },
          {
            file: "submodule2",
            fileid: "module1.submodule2",
            dir: `${rootDir}/multiple/module1/migrations`,
            files: [
              {file: "1-init.mysql", dir: `${rootDir}/multiple/module1/migrations/submodule2`},
            ],
            modules: []
          }
        ],
      },
      { file: "module2", 
        fileid: "module2",
        dir: `${rootDir}/multiple`,
        files: [
          {file: "1-init.mysql", dir: `${rootDir}/multiple/module2/migrations`},
          {file: "2-update.mysql", dir: `${rootDir}/multiple/module2/migrations`},
        ],
        modules: [
          {
            file: "submodule1",
            fileid: "module2.submodule1",
            dir: `${rootDir}/multiple/module2/migrations`,
            files: [
              {file: "1-init.mysql", dir: `${rootDir}/multiple/module2/migrations/submodule1`},
              {file: "2-update.mysql", dir: `${rootDir}/multiple/module2/migrations/submodule1`},
            ],
            modules: []
          }
        ],
      }
    ];
    const modules = await api.scanModules(path.join(rootDir, "multiple"));
    expect(modules).toEqual(expectedModules);
  });
});
