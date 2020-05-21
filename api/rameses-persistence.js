const path = require("path");
const fs = require("fs");
const util = require("util");
const readdir = util.promisify(fs.readdir);

const converter = require("xml-js");
const converterOptions = { compact: true, spaces: 2 };

const log = {
  info: (...args) => console.log("INFO", args),
  warn: (...args) => console.log("WARN", args),
  error: (...args) => console.log("ERROR", args),
};

const loadFiles = async (dir, filter, handler) => {
  const files = await readdir(dir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pathName = path.join(dir, file);
    if (fs.lstatSync(pathName).isDirectory()) {
      await loadFiles(pathName, filter, handler);
    } else if (filter(file)) {
      try {
        const data = fs.readFileSync(path.join(dir, file));
        handler(file, data, pathName);
      } catch (err) {
        log.error(file + ": " + err);
      }
    }
  }
};

/*===========================================================
*
* SCHEMA SUPPORT
*
============================================================*/
const FIELD_TYPE = {
  string: 1,
  integer: 2,
  decimal: 3,
  bolean: 4,
  date: 5,
};

class Schema {
  constructor(schemaName, obj) {
    this.name = schemaName;
    this.tablename = this.name;
    this.setPropertyValues(obj.schema.element._attributes);
    this.buildFields(obj.schema.element.field);
  }

  getField(name) {
    return this.fields.find(field => field.name === name);
  }

  buildFields(fieldList) {
    this.fields = [];
    fieldList.forEach((fld) => {
      this.fields.push(new Field(fld._attributes));
    });
  }
}

class Field {
  constructor(attributes) {
    this.setPropertyValues(attributes);
  }
}

const setPropertyValues = function (attributes) {
  if (attributes) {
    for (let key in attributes) {
      if (attributes.hasOwnProperty(key)) {
        const value = attributes[key];
        const isBoolKey = /^(primary|required)$/i;
        if (isBoolKey.test(key)) {
          this[key] = /^(t|true|y|yes|1)$/i.test(value);
        } else {
          this[key] = value;
        }
      }
    }
  }
};

Schema.prototype.setPropertyValues = setPropertyValues;
Field.prototype.setPropertyValues = setPropertyValues;

const schemaCache = {};

const createSchema = (file, schemaObj) => {
  const schemaName = file.replace(".xml", "");
  schemaCache[schemaName] = new Schema(schemaName, schemaObj);
};

const loadSchema = async (schemaPath) => {
  await loadFiles(
    schemaPath,
    (file) => file.endsWith(".xml"),
    (file, xml, dir) => {
      const schemaObj = converter.xml2js(xml.toString(), converterOptions);
      createSchema(file, schemaObj);
    }
  );
};

const getSchema = (name) => {
  const schema = schemaCache[name];
  if (!schema) throw Error(name + " is not defined.");
  return schema;
};

/*===========================================================
*
* SQL FILE SUPPORT
*
============================================================*/

const sqlExecutors = {};

const executor = (name) => {
  const executor = sqlExecutors[name];
  if (!executor) throw Error(name + " is not registered");
  return executor;
};

const buildFieldsArray = (sql) => {
  const fields = [];
  const result = sql.matchAll(/\$P{(.+)}/gim);
  const matches = Array.from(result);
  matches.forEach((match) => {
    fields.push(match[1]);
  });
  return fields;
};

const createSqlExecutor = (file, sqlMethod, rawSql) => {
  const newMethod = (params = {}) => {
    const fields = buildFieldsArray(rawSql);
    const sql = rawSql
      .replace(/\$P{.+}/gim, "?")
      .replace(/\n/gm, " ")
      .trim();
    const values = [];
    fields.forEach((fld) => {
      values.push(params[fld]);
    });
    return [sql, values];
  };

  const sqlName = file.replace(".sql", "");
  let executor = sqlExecutors[sqlName];
  if (!executor) {
    executor = {};
    sqlExecutors[sqlName] = executor;
  }
  executor[sqlMethod] = newMethod;
};

const createSqlExecutors = (file, sqlText) => {
  const keyRegex = /\[(.+)\]/;
  const res = sqlText.split(keyRegex);
  for (let i = 1; i < res.length; i += 2) {
    createSqlExecutor(file, res[i], res[i + 1]);
  }
};

const loadSqlFiles = async (sqlPath) => {
  await loadFiles(
    sqlPath,
    (file) => file.endsWith(".sql"),
    (file, sqlText, dir) => {
      createSqlExecutors(file, sqlText.toString());
    }
  );
};

const loadResources = async (dir) => {
  await loadSchema(path.join(dir, "schema"));
  await loadSqlFiles(path.join(dir, "sql"));
};

/*===========================================================
*
* DB SUPPORT
*
============================================================*/

/*========================================================
* params fields:
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
const getListSql = (params) => {
  const { schema } = params;
  const fieldSql = getSelectFieldSql(params);
  const [whereSql, values] = getWhereClause(params);
  const orderBySql = getOrderByClause(params);
  const limitSql = getLimitClause(params);

  const stmt = [];
  stmt.push("SELECT");
  stmt.push(fieldSql);
  if (schema.name) {
    stmt.push("FROM " + schema.name);
  }
  whereSql && stmt.push(whereSql);
  orderBySql && stmt.push(orderBySql);
  limitSql && stmt.push(limitSql);
  return [stmt.join(" "), values];
};

const getSelectFieldSql = (params) => {
  if (params.select) {
    return params.select;
  } else {
    return "*";
  }
};

const resolveObjectWhere = (params) => {
  const findBy = params.where;
  if (findBy && !Array.isArray(findBy) && typeof findBy === "object") {
    // this is a map, convert to where specs ['a = :a', {:}]
    const whereClause = [];
    for (key in findBy) {
      whereClause.push(`${key}=:${key}`);
    }
    params.where = [whereClause.join(" AND "), findBy];
  }
};

const getWhereClause = (params) => {
  resolveObjectWhere(params);

  let whereSql = null;
  let values = [];
  const { where } = params;

  if (where && where.length > 0 && where[0]) {
    whereSql = "WHERE " + where[0].replace(/:[a-zA-Z]+/g, "?");
    if (where.length > 1) {
      const fields = where[0].match(/:[a-zA-Z]+/g);
      if (fields) {
        fields.forEach((fld) => {
          values.push(where[1][fld.replace(":", "")]);
        });
      }
    }
  }

  return [whereSql, values];
};

const getOrderByClause = (params) => {
  const { orderBy } = params;
  return orderBy && `ORDER BY ${orderBy}`;
};

const getLimitClause = (params) => {
  const { start, limit } = params;

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
};

const getInsertFields = (params, data) => {
  const { schema } = params;
  const fields = [];
  const preparedValues = [];
  const values = [];

  schema.fields.forEach((fld) => {
    fields.push(fld.name);
    preparedValues.push("?");
    values.push(serializeValue(fld, data[fld.name]));
  });

  return [fields.join(", "), preparedValues, values];
};

const serializer = {
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
    return value.toISOString().replace(/\..*/, '').replace("T", " ");
  },

  json: (field, value) => {
    return JSON.stringify(value);
  }
};

const deserializer = {
  boolean: (field, value) => {
    return /(1|yes|y|t|true)/i.test(value.toString());
  },

  json: (field, value) => {
    return JSON.parse(value);
  }
};

const serializeValue = (field, value) => {
  if (field.required && (value === null || value === undefined) ) {
    throw Error(field.name + " must be specified.");
  }

  if (!value) {
    return value;
  }

  const dataType = field.type || "string";
  const serialize = serializer[dataType.toLowerCase()];
  return serialize(field, value);
};

const deserializeValue = (field, value) => {
  const dataType = field.type || "string";
  const deserialize = deserializer[dataType.toLowerCase()];
  if (value && deserialize) {
    return deserialize(field, value);
  } 
  return value;
};

const getUpdateFields = (params, data) => {
  const { schema } = params;
  const schemaFields = schema.fields;

  const updateFields = [];
  const values = [];

  for (let key in data) {
    if (!data.hasOwnProperty(key)) continue;
    const field = schemaFields.find((fld) => fld.name === key);
    if (!field) continue;
    if (field.primary) continue;

    updateFields.push(field.name + "=?");
    values.push(serializeValue(field, data[field.name]));
  }

  let updateSql = updateFields.join(", ");
  return [updateSql, values];
};

const getPrimaryKeyFilter = (schema, entity) => {
  const pkeyFields = schema.fields.filter((fld) => fld.primary);
  const filter = {};
  pkeyFields.forEach((fld) => {
    filter[fld.name] = entity[fld.name];
  });
  return filter;
};

const getInsertSql = (schema, entity) => {
  const params = { schema };
  const [fieldSql, preparedValues, values] = getInsertFields(params, entity);

  let sql = "";
  sql += "INSERT INTO " + schema.name + " (";
  sql += fieldSql;
  sql += ") VALUES(";
  sql += preparedValues.join(",");
  sql += ")";
  return [sql, values];
};

const getUpdateSql = (params, entity) => {
  const { schema } = params;
  const [updateSql, values] = getUpdateFields(params, entity);
  const [whereSql, whereValues] = getWhereClause(params);
  values.push(...whereValues);

  let sql = "";
  sql += "UPDATE " + schema.name + " SET";
  sql += " " + updateSql;
  if (whereSql) {
    sql += " " + whereSql;
  }
  return [sql, values];
};

const getDeleteSql = (params) => {
  const { schema } = params;
  const [whereSql, values] = getWhereClause(params);
  let sql = "";
  sql += "DELETE FROM " + schema.name;
  if (whereSql) {
    sql += " " + whereSql;
  }
  return [sql, values];
};

const buildData = (schema, rawData) => {
  const entity = {};
  for (let key in rawData) {
    if (rawData.hasOwnProperty(key)) {
      const field = schema.getField(key);
      entity[key] = deserializeValue(field, rawData[key]);
    }
  }
  return entity;
};

const persistence = (db, schemaName, buildParam = {select: "*"}) => {
  const schema = getSchema(schemaName);
  const sqlBuilder = schemaSqlBuilder(schema, buildParam);
  return {
    read: async (entity) => {
      const [sql, values] = sqlBuilder.getReadSql(entity);
      const dataArr = await db.execute(sql, values);
      if (dataArr.length === 0) {
        return null;
      }
      return buildData(schema, dataArr[0]);
    },
    create: async (entity) => {
      const [sql, values] = sqlBuilder.getCreateSql(entity);
      await db.execute(sql, values);
      return entity;
    },
    update: async (entity) => {
      const [sql, values] = sqlBuilder.getUpdateSql(entity);
      await db.execute(sql, values);
      return entity;
    },
    deleteEntity: async (entity) => {
      const [sql, values] = sqlBuilder.getDeleteSql(entity);
      await db.execute(sql, values);
      return entity;
    },
    select: (fields) => {
      sqlBuilder.select(fields);
      return persistence(db, schemaName, buildParam);
    },
    find: (findBy) => {
      sqlBuilder.find(findBy);
      return persistence(db, schemaName, buildParam);
    },
    where: (where) => {
      sqlBuilder.where(where);
      return persistence(db, schemaName, buildParam);
    },
    orderBy: (orderBy) => {
      sqlBuilder.orderBy(orderBy);
      return persistence(db, schemaName, buildParam);
    },
    limit: (start) => {
      sqlBuilder.limit(start);
      return persistence(db, schemaName, buildParam);
    },
    limit: (start, limit) => {
      sqlBuilder.limit(start, limit);
      return persistence(db, schemaName, buildParam);
    },
    first: async () => {
      const [sql, values] = sqlBuilder.first();
      const dataArr = await db.execute(sql, values);
      if (dataArr.length === 0) {
        return null;
      }
      return buildData(schema, dataArr[0]);
    },
    list: async () => {
      const [sql, values] = sqlBuilder.list();
      const dataArr = await db.execute(sql, values);
      if (dataArr.length === 0) {
        return [];
      }
      const list = [];
      for (let i = 0; i < dataArr.length; i++) {
        list.push(buildData(schema, dataArr[i]));
      }
      return list;
    },
  };
};


const schemaSqlBuilder = (schema, buildParam = { select: "*" }) => {
  buildParam.schema = schema;

  const reset = () => {
    buildParam.select = "*";
    delete buildParam.where;
    delete buildParam.orderBy;
    delete buildParam.start;
    delete buildParam.limit;
  }

  return {
    reset: reset,
    getCreateSql: (entity) => {
      return getInsertSql(schema, entity);
    },
    getReadSql: (entity) => {
      const where = getPrimaryKeyFilter(schema, entity);
      const params = { select: "*", where };
      const builder = schemaSqlBuilder(schema, params);
      const [sql, values] = builder.find(where).first();
      reset();
      return [sql.replace(" LIMIT 1", ""), values];
    },
    getUpdateSql: (entity) => {
      const where = getPrimaryKeyFilter(schema, entity);
      const builder = schemaSqlBuilder(schema);
      const result = builder.find(where).update(entity);
      reset();
      return result;
    },
    getDeleteSql: (entity) => {
      const where = getPrimaryKeyFilter(schema, entity);
      const builder = schemaSqlBuilder(schema, { where });
      const result =  builder.delete();
      reset();
      return result;
    },
    select: (selectedFields) => {
      buildParam.select = selectedFields;
      return schemaSqlBuilder(schema, buildParam);
    },
    find: (findBy) => {
      buildParam.where = findBy;
      return schemaSqlBuilder(schema, buildParam);
    },
    where: (where) => {
      buildParam.where = where;
      return schemaSqlBuilder(schema, buildParam);
    },
    orderBy: (orderBy) => {
      buildParam.orderBy = orderBy;
      return schemaSqlBuilder(schema, buildParam);
    },
    limit: (start) => {
      if (start && start >= 0) {
        buildParam.start = start;
      }
      return schemaSqlBuilder(schema, buildParam);
    },
    limit: (start, limit) => {
      if (start && start >= 0) {
        buildParam.start = start;
      }
      if (limit && limit >= 0) {
        buildParam.limit = limit;
      }
      return schemaSqlBuilder(schema, buildParam);
    },
    list: () => {
      const result = getListSql(buildParam);
      reset();
      return result;
    },
    first: () => {
      buildParam.start = null;
      buildParam.limit = 1;
      const result = getListSql(buildParam);
      reset();
      return result;
    },
    update: (entity) => {
      const result = getUpdateSql(buildParam, entity);
      reset();
      return result;
    },
    delete: () => {
      const result = getDeleteSql(buildParam);
      reset();
      return result;
    },
  };
};

module.exports = {
  Schema,
  Field,
  loadResources,
  getSchema,
  persistence,
  executor,
  schemaSqlBuilder,
};
