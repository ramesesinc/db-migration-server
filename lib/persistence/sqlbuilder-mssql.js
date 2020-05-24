const SqlBuilder = require("./sqlbuilder");

class MsSqlBuilder extends SqlBuilder {
  constructor(schema) {
    super(schema, ['[', ']']);
  }

  readEntity(entity) {
    const findByPk = this.getPrimaryKeyFilter(entity);
    const [sql, values] = this.select("*").find(findByPk).first();
    return [sql.replace(" TOP 1", ""), values];
  }

  list() {
    const fieldSql = this.getSelectFieldSql();
    const [whereSql, values] = this.getWhereClause();
    const orderBySql = this.getOrderByClause();
    const limitSql = this.getLimitClause();

    const { schema } = this._params;
    const stmt = [];
    stmt.push("SELECT");
    if (limitSql) {
      stmt.push(limitSql);
    }
    stmt.push(fieldSql);
    if (schema.name) {
      stmt.push("FROM " + schema.name);
    }
    whereSql && stmt.push(whereSql);
    orderBySql && stmt.push(orderBySql);
    this.resetParams();
    return [stmt.join(" "), values];
  }

  first() {
    this._params.start = null;
    this._params.limit = 1;
    return this.list();
  }

  getValuePlaceholder(valueKey) {
    if (/:/.test(valueKey)) {
      return valueKey.replace(/:/, "@");
    }
    return `@${valueKey}`;
  }

  getWhereClause() {
    this.resolveObjectWhere();

    let whereSql = null;
    let values = [];
    const { where } = this._params;

    if (where && where.length > 0 && where[0]) {
      let delimitedWhere = this.delimitWhereFields(where[0]);
      const paramFields = where[0].match(/:[a-zA-Z]+/g);
      if (paramFields) {
        paramFields.forEach(field => {
          const re = new RegExp(field, "g");
          delimitedWhere = delimitedWhere.replace(re, this.getValuePlaceholder(field));
          if (where.length > 1) {
            const fieldName = field.replace(":", "");
            const schemaField = this._schema && this._schema.getField(fieldName);
            values.push({
              field: fieldName,
              value: where[1][fieldName],
              type: (schemaField && schemaField.type) || "string",
            });
          }
        })
      }
      whereSql = `WHERE ${delimitedWhere}`;
    }

    return [whereSql, values];
  }

  getLimitClause() {
    const { start, limit } = this._params;
    if (limit > 0) {
      return `TOP ${limit}`;
    }
    return null;
  }
}

module.exports = MsSqlBuilder;