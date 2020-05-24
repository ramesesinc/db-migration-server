const SqlBuilder = require("./sqlbuilder");

class MySqlBuilder extends SqlBuilder {
  constructor(schema) {
    super(schema, ['`', '`']);
  }
}

module.exports = MySqlBuilder