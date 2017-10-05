var compare, debug, eql, filter, moment, ops, ref, type, types,
  hasProp = {}.hasOwnProperty;

debug = require('debug')('filter:match');

moment = require('moment-timezone');

ref = require('./utils'), type = ref.type, eql = ref.eql;

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

filter = function(obj, query) {
  var i, ii, key, keys, matches, prefix, q, ret, search, subset, target, val;
  if (obj == null) {
    obj = {};
  }
  ret = {};
  for (key in query) {
    if (!hasProp.call(query, key)) continue;
    val = query[key];
    keys = key.split('.');
    target = obj;
    matches = [];
    i = 0;
    walk_keys: //;
    while (i < keys.length) {
      target = target[keys[i]];
      switch (type(target)) {
        case 'array':
          prefix = keys.slice(0, i + 1).join('.');
          search = keys.slice(i + 1).join('.');
          debug('searching array "%s"', prefix);
          if (val.$size && !search.length) {
            return compare(val, target);
          }
          subset = ret[prefix] || target;
          ii = 0;
          while (ii < subset.length) {
            if (search.length) {
              q = {};
              q[search] = val;
              if ('object' === type(subset[ii])) {
                debug('attempting subdoc search with query %j', q);
              }
              if (filter(subset[ii], q)) {
                if (!ret[prefix] || !~ret[prefix].indexOf(subset[ii])) {
                  matches.push(subset[ii]);
                }
              }
            } else {
              debug('performing simple array item search');
              if (compare(val, subset[ii])) {
                if (!ret[prefix] || !~ret[prefix].indexOf(subset[ii])) {
                  matches.push(subset[ii]);
                }
              }
            }
            ii++;
          }
          if (matches.length) {
            ret[prefix] = ret[prefix] || [];
            ret[prefix].push.apply(ret[prefix], matches);
          }
          break walk_keys;
          break;
        case 'undefined':
          return false;
        case 'object':
          if (null !== keys[i + 1]) {
            i++;
            continue;
          } else if (!compare(val, target)) {
            return false;
          }
          break;
        default:
          if (!compare(val, target)) {
            return false;
          }
      }
      i++;
    }
  }
  return ret;
};

ops = {
  $nor: function(matcher, val) {
    return !matcher.some(function(subquery) {
      return filter(subquery, val);
    });
  },
  $and: function(matcher, val) {
    return matcher.every(function(subquery) {
      return filter(subquery, val);
    });
  },
  $all: function(matcher, val) {
    return this.$and(matcher, val);
  },
  $or: function(matcher, val) {
    return matcher.some(function(subquery) {
      return filter(subquery, val);
    });
  },
  $mod: function(matcher, val) {
    return matcher.some(function(arr) {
      return val % arr[0] === arr[1];
    });
  },
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
      debug('found times', parsed, start, stop, a.isBetween(s, e));
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
  $where: function(matcher, val) {
    var fn;
    fn = typeof matcher === 'string' ? new Function('obj', 'return ' + matcher) : matcher;
    return fn.call(val, val);
  },
  $size: function(matcher, val) {
    return Array.isArray(val) && matcher === val.length;
  }
};

compare = function(matcher, val) {
  var j, key, keys, len;
  if ('object' !== type(matcher)) {
    return eql(matcher, val);
  }
  keys = Object.keys(matcher);
  if ('$' !== keys[0][0]) {
    return eql(matcher, val);
  }
  for (j = 0, len = keys.length; j < len; j++) {
    key = keys[j];
    if ('$elemMatch' === key) {
      return false !== filter(val, matcher.$elemMatch);
    } else {
      if (!ops[key](matcher[key], val)) {
        return false;
      }
    }
  }
  return true;
};

module.exports = filter;

module.exports.ops = Object.keys(ops);
