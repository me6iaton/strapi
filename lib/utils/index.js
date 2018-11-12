'use strict';

/**
 * Module dependencies
 */

module.exports = mongoose => {
  var Decimal = require('mongoose-float').loadType(mongoose, 2);
  var Int32 = require('mongoose-int32');
  mongoose.Schema.Types.Int32 = Int32;

  return {
    convertType: mongooseType => {
      switch (mongooseType.toLowerCase()) {
        case 'array':
          return Array;
        case 'boolean':
          return 'Boolean';
        case 'binary':
          return 'Buffer';
        case 'date':
        case 'datetime':
        case 'time':
        case 'timestamp':
          return Date;
        case 'decimal':
          return Decimal;
        case 'float':
          return Number;
        case 'json':
          return 'Mixed';
        case 'biginteger':
          return Number;
        case 'integer':
          return Int32;
        case 'uuid':
          return 'ObjectId';
        case 'email':
        case 'enumeration':
        case 'password':
        case 'string':
        case 'text':
          return 'String';
        default:
      }
    },
  };
};
