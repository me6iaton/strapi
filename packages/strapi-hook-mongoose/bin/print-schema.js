#!/usr/bin/env node

const { readFile, writeFile } = require('fs');
const { promisify } = require('util');
const _ = require('lodash');
const strapi = require('../../strapi/lib/index.js');

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

_.mixin({
  deeply: (map) => {
    return (obj, fn) => {
      return map(_.mapValues(obj, (v) => {
        return _.isPlainObject(v) ? _.deeply(map)(v, fn) : v;
      }), fn);
    };
  },
});

const dropQuotesRe = /("%>|<%")/g;
const markQuotesToDrop = str => `%>${str}<%`;
const omitAdminGeneratedSchemaRe = /\/\/<%([^%>]+)?%>/g;

function inlineType(mongooseType) {
  switch (mongooseType.toLowerCase()) {
    case 'array':
      return markQuotesToDrop('Array');
    case 'boolean':
      return 'Boolean';
    case 'binary':
      return 'Buffer';
    case 'date':
    case 'datetime':
    case 'time':
    case 'timestamp':
      return markQuotesToDrop('Date');
    case 'decimal':
      return markQuotesToDrop(`require('mongoose-float').loadType(require('mongoose'), 2)`);
    case 'float':
      return markQuotesToDrop(`require('mongoose-float').loadType(require('mongoose'), 10)`);
    case 'json':
      return 'Mixed';
    case 'biginteger':
    case 'integer':
      return 'Number';
    case 'uuid':
      return markQuotesToDrop(`require('mongoose').Schema.Types.ObjectId`);
    case 'email':
    case 'enumeration':
    case 'password':
    case 'string':
    case 'text':
      return 'String';
    default:
  }
}

( async () => {
  try {
    await strapi.load();
    for (let key in strapi.models) {
      let model = strapi.models[key];
      if (model.override) {
        let diff = _.omit(model.loadedModel, _.keys(model.override));
        diff = _.mapValues(diff, (prop, key) => {
          if (_.isFunction(prop.type)) {
            prop.type = inlineType(model.attributes[key].type || 'uuid');
          } else if (_.isArray(prop)) {
            prop = prop.map(o => {
              prop = _.assign(o, {type: inlineType('uuid')});
              prop = _.mapKeys(prop, (val, key) => markQuotesToDrop(key));
              return prop;
            });
          }
          return prop;
        });
        diff = _.deeply(_.mapKeys)(diff, (val, key) => markQuotesToDrop(key));
        const diffSrt = JSON.stringify(diff, null, 2).replace(dropQuotesRe, '');
        const filePath = `${strapi.config.appPath}/api/${model.collectionName}/models/${model.modelName}.override.js`;
        let text = await readFileAsync(filePath, {encoding: 'utf8'});
        text = text.replace(omitAdminGeneratedSchemaRe, `//<%$\n${diffSrt}\n//%>`);
        await writeFileAsync(filePath, text, { encoding: 'utf8' });
      }
    }
  } catch (err) {
    console.log('ERROR:', err);
    process.exit(1);
  }
  process.exit(0);
})();
