const util = require("../util");

const converter = require("xml-js");
const converterOptions = { compact: true, spaces: 2 };

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
    this.type = "string";
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
  await util.loadFiles(
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

module.exports = {
  loadSchema,
  getSchema,
};
