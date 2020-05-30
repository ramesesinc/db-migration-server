/*========================================================
* _params fields:
*   select - string of comma separated fields
*   where  - an object or array
*               {name: 'a%', address: 'cebu'}
*               ['basic where cause']
*               ['where cause with dynamic args ? ', [args]]
*   orderBy - string of comma separated order fields 
*   start  - base 0
*   limit  -  
*  __DEBUG__
========================================================*/
class SqlBuilder {
  constructor(schema, delimiter = ["", ""]) {
    this._schema = schema;
    this._delimiter = delimiter;
    this._params = { schema, select: "*" };
    this.init();
  }

  get schema() {
    return this._schema || {};
  }

  get params() {
    return this._params;
  }

  list() {
    const fieldSql = this.getSelectFieldSql();
    const [whereSql, values] = this.getWhereClause();
    const orderBySql = this.getOrderByClause();
    const limitSql = this.getLimitClause();

    const { schema } = this._params;
    const stmt = [];
    stmt.push("SELECT");
    stmt.push(fieldSql);
    if (schema.name) {
      stmt.push("FROM " + schema.name);
    }
    whereSql && stmt.push(whereSql);
    orderBySql && stmt.push(orderBySql);
    limitSql && stmt.push(limitSql);
    this.resetParams();
    return [stmt.join(" "), values];
  }

  first() {
    this._params.start = null;
    this._params.limit = 1;
    return this.list();
  }

  createEntity(entity) {
    return this.getInsertSql(entity);
  }

  readEntity(entity) {
    const findByPk = this.getPrimaryKeyFilter(entity);
    const [sql, values] = this.select("*").find(findByPk).first();
    return [sql.replace(" LIMIT 1", ""), values];
  }

  updateEntity(entity) {
    const pks = this.getPrimaryKeyFilter(entity);
    return this.find(pks).update(entity);
  }

  deleteEntity(entity) {
    const pks = this.getPrimaryKeyFilter(entity);
    return this.find(pks).delete();
  }

  update(entity) {
    const result = this.getUpdateSql(entity);
    this.resetParams();
    return result;
  }

  delete() {
    const result = this.getDeleteSql();
    this.resetParams();
    return result;
  }

  getPrimaryKeyFilter(entity) {
    const pkeyFields = this._schema.fields.filter((fld) => fld.primary);
    const filter = {};
    pkeyFields.forEach((fld) => {
      filter[fld.name] = entity[fld.name];
    });
    return filter;
  }

  resetParams() {
    this._params = {
      schema: this._schema,
      select: "*",
    };
  }

  select(fields) {
    this._params.select = fields;
    return this;
  }

  find(findBy) {
    this._params.where = findBy;
    return this;
  }

  where(where) {
    this._params.where = where;
    return this;
  }

  orderBy(orderBy) {
    this._params.orderBy = orderBy;
    return this;
  }

  limit(start, limit) {
    if (!limit && start > 0) {
      this._params.limit = start;
    } else {
      if (start >= 0) {
        this._params.start = start;
      }
      if (limit >= 0) {
        this._params.limit = limit;
      }
    }
    return this;
  }

  getInsertSql(entity) {
    const [fieldSql, preparedValues, values] = this.getInsertFields(entity);

    let sql = "";
    sql += "INSERT INTO " + this._schema.name + " (";
    sql += fieldSql;
    sql += ") VALUES(";
    sql += preparedValues.join(",");
    sql += ")";
    return [sql, values];
  }

  getValuePlaceholder(valueKey) {
    return "?";
  }

  getInsertFields(data) {
    const fields = [];
    const preparedValues = [];
    const values = [];

    this._schema.fields.forEach((fld) => {
      fields.push(this.delimitField(fld.name));
      preparedValues.push(this.getValuePlaceholder(fld.name));
      values.push({
        field: fld.name,
        value: this.serializeValue(fld, data[fld.name]),
        type: fld.type,
      });
    });

    return [fields.join(","), preparedValues, values];
  }

  init() {
    this._serializer = {
      string: (field, value) => {
        return value;
      },

      boolean: (field, value) => {
        return value ? 1 : 0;
      },

      integer: (field, value) => {
        const intVal = parseInt(value);
        if (isNaN(intVal)) {
          throw Error(field + " is an invalid integer.");
        }
        return intVal;
      },

      decimal: (field, value) => {
        const floatVal = parseFloat(value);
        if (isNaN(floatVal)) {
          throw Error(field + " is an invalid decimal.");
        }
        return floatVal;
      },

      date: (field, value) => {
        return value.toISOString().replace(/\..*/, "").replace("T", " ");
      },

      json: (field, value) => {
        return JSON.stringify(value);
      },
    };

    this._deserializer = {
      boolean: (field, value) => {
        return /(1|yes|y|t|true)/i.test(value.toString());
      },

      json: (field, value) => {
        return JSON.parse(value);
      },
    };
  }

  serializeValue(field, value) {
    if (field.required && (value === null || value === undefined)) {
      throw Error(field.name + " must be specified.");
    }

    if (!value) {
      return value;
    }

    const dataType = field.type || "string";
    const serialize = this._serializer[dataType.toLowerCase()];
    return serialize(field, value);
  }

  deserializeValue(field, value) {
    const dataType = field.type || "string";
    const deserialize = this._deserializer[dataType.toLowerCase()];
    if (value && deserialize) {
      return deserialize(field, value);
    }
    return value;
  }

  getDeleteSql() {
    const { schema } = this._params;
    const [whereSql, values] = this.getWhereClause();
    let sql = "";
    sql += "DELETE FROM " + schema.name;
    if (whereSql) {
      sql += " " + whereSql;
    }
    return [sql, values];
  }

  getUpdateSql(entity) {
    const { schema } = this._params;
    const [updateSql, values] = this.getUpdateFields(entity);
    const [whereSql, whereValues] = this.getWhereClause();
    values.push(...whereValues);

    let sql = "";
    sql += "UPDATE " + schema.name + " SET";
    sql += " " + updateSql;
    if (whereSql) {
      sql += " " + whereSql;
    }
    return [sql, values];
  }

  getUpdateFields(data) {
    const { schema } = this._params;
    const schemaFields = schema.fields;

    const updateFields = [];
    const values = [];

    for (let key in data) {
      if (!data.hasOwnProperty(key)) continue;
      const field = schemaFields.find((fld) => fld.name === key);
      if (!field) continue;
      if (field.primary) continue;

      updateFields.push(
        this.delimitField(field.name) +
          "=" +
          this.getValuePlaceholder(field.name)
      );
      values.push({
        field: field.name,
        value: this.serializeValue(field, data[field.name]),
        type: field.type,
      });
    }

    let updateSql = updateFields.join(", ");
    return [updateSql, values];
  }

  delimitField(field) {
    if (/\*/.test(field)) {
      return field;
    } else {
      return `${this._delimiter[0]}${field}${this._delimiter[1]}`;
    }
  }

  getSelectFieldSql() {
    if (this._params.select) {
      const fields = this._params.select.split(/ *, */);
      const delimitedFields = [];
      fields.forEach((field) => {
        delimitedFields.push(this.delimitField(field));
      });
      return delimitedFields.join(",");
    } else {
      return "*";
    }
  }

  resolveObjectWhere() {
    const findBy = this._params.where;
    if (findBy && !Array.isArray(findBy) && typeof findBy === "object") {
      // this is a map, convert to where specs ['a = :a', {:}]
      const whereClause = [];
      for (let key in findBy) {
        whereClause.push(`${key}=:${key}`);
      }
      this._params.where = [whereClause.join(" AND "), findBy];
    }
  }

  delimitWhereFields(whereStr) {
    const tokens = whereStr.split(/ +/);
    const delimitedWhere = [];
    tokens.forEach((token) => {
      if (/.+=.+/.test(token)) {
        const matches = token.match(/(.+)(=)(.+)/);
        const delimitedField = this.delimitField(matches[1]);
        delimitedWhere.push(`${delimitedField}${matches[2]}${matches[3]}`);
      } else if (this._schema.getField(token)) {
        delimitedWhere.push(this.delimitField(token));
      } else {
        delimitedWhere.push(token);
      }
    });
    return delimitedWhere.join(" ");
  }

  getWhereClause() {
    this.resolveObjectWhere();

    let whereSql = null;
    let values = [];
    const { where } = this._params;

    if (where && where.length > 0 && where[0]) {
      const delimitedWhere = this.delimitWhereFields(where[0]);
      whereSql =
        "WHERE " +
        delimitedWhere.replace(/:[a-zA-Z]+/g, this.getValuePlaceholder());
      if (where.length > 1) {
        const fields = where[0].match(/:[a-zA-Z]+/g);
        if (fields) {
          fields.forEach((fld) => {
            const fieldName = fld.replace(":", "");
            const schemaField =
              this._schema && this._schema.getField(fieldName);
            values.push({
              field: fieldName,
              value: where[1][fieldName],
              type: (schemaField && schemaField.type) || "string",
            });
          });
        }
      }
    }

    return [whereSql, values];
  }

  getOrderByClause() {
    const { orderBy } = this._params;
    return orderBy && `ORDER BY ${orderBy}`;
  }

  getLimitClause() {
    const { start, limit } = this._params;

    const limitArr = [];
    if (start && start > 0) {
      limitArr.push(start);
    }
    if (limit && limit > 0) {
      limitArr.push(limit);
    }

    let limitSql = null;
    if (limitArr.length > 0) {
      limitSql = "LIMIT " + limitArr.join(",");
    }

    return limitSql;
  }
}

module.exports = SqlBuilder;
