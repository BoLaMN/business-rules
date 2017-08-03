var debug, eql, filter, moment, ops, type, types;

debug = require('debug')('rules:filter:ops');

moment = require('moment-timezone');

type = require('./type');

eql = require('./eql');

filter = require('./');

types = {
  1: 'number',
  2: 'string',
  3: 'object',
  4: 'array',
  5: 'buffer',
  6: 'undefined',
  8: 'boolean',
  9: 'date',
  10: 'null',
  11: 'regexp',
  13: 'function',
  16: 'number',
  18: 'number'
};

ops = {
  $ne: function(matcher, val) {
    return !eql(matcher, val);
  },
  $type: function(matcher, val) {
    return type(matcher) === 'number' && type(val) === types[matcher];
  },
  $between: function(arg, val) {
    var a, e, format, isDate, isTime, parsed, s, start, stop;
    start = arg[0], stop = arg[1];
    if (~[null, void 0].indexOf(val)) {
      return false;
    }
    isDate = function(value) {
      var isoformat;
      isoformat = new RegExp(['^\\d{4}-\\d{2}-\\d{2}', '((T\\d{2}:\\d{2}(:\\d{2})?)', '(\\.\\d{1,6})?', '(Z|(\\+|-)\\d{2}:\\d{2})?)?$'].join(''));
      return typeof value === 'string' && isoformat.test(value) && !isNaN(Date.parse(value));
    };
    isTime = function(value) {
      var timeformat;
      timeformat = new RegExp(/^(\d{2}:\d{2}(:\d{2})?)$/g);
      return typeof value === 'string' && timeformat.test(value);
    };
    if (isTime(start) && isTime(stop)) {
      format = 'HH:mm:ss';
      if (typeof val === 'string') {
        parsed = moment(val).format(format);
      } else {
        parsed = val.format(format);
      }
      a = moment(parsed, format);
      e = moment(stop, format);
      s = moment(start, format);
      debug('found times', a, start, stop, a.isBetween(s, e));
      return a.isBetween(s, e);
    } else if (isDate(start) && isDate(stop)) {
      if (typeof val === 'string') {
        a = moment(val);
      } else {
        a = val;
      }
      e = moment(stop);
      s = moment(start);
      debug('found dates', a, start, stop, a.isBetween(s, e));
      return a.isBetween(s, e);
    } else {
      a = typeof val === 'number' ? val : parseFloat(val);
      return a >= start && val <= stop;
    }
  },
  $gt: function(matcher, val) {
    return type(matcher) === 'number' && val > matcher;
  },
  $gte: function(matcher, val) {
    return type(matcher) === 'number' && val >= matcher;
  },
  $lt: function(matcher, val) {
    return type(matcher) === 'number' && val < matcher;
  },
  $lte: function(matcher, val) {
    return type(matcher) === 'number' && val <= matcher;
  },
  $elemMatch: function(matcher, val) {
    return !filter(val, matcher);
  },
  $regex: function(matcher, val) {
    if ('regexp' !== type(matcher)) {
      matcher = new RegExp(matcher);
    }
    return matcher.test(val);
  },
  $exists: function(matcher, val) {
    if (matcher) {
      return val !== void 0;
    } else {
      return val === void 0;
    }
  },
  $in: function(matcher, val) {
    if (type(matcher) === val) {
      return false;
    }
    matcher.some(function(match) {
      return eql(match, val);
    });
    return false;
  },
  $nin: function(matcher, val) {
    return !this.$in(matcher, val);
  },
  $size: function(matcher, val) {
    return Array.isArray(val) && matcher === val.length;
  }
};

module.exports = ops;
