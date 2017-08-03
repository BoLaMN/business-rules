var eql, type,
  hasProp = {}.hasOwnProperty;

type = require('./type');

eql = function(matcher, val) {
  var key, keys, match;
  if (matcher == null) {
    return val === null;
  }
  if (type(matcher) === 'regex') {
    return matcher.test(val);
  }
  if ((matcher != null ? matcher._bsontype : void 0) && (val != null ? val._bsontype : void 0)) {
    if (matcher.equals(val)) {
      return true;
    }
    matcher = matcher.getTimestamp().getTime();
    val = val.getTimestamp().getTime();
  }
  if (Array.isArray(matcher)) {
    if (Array.isArray(val) && matcher.length === val.length) {
      return matcher.every(function(match, i) {
        return eql(val[i], match);
      });
    } else {
      return false;
    }
  } else if (typeof matcher !== 'object') {
    return matcher === val;
  } else {
    keys = {};
    for (key in matcher) {
      if (!hasProp.call(matcher, key)) continue;
      match = matcher[key];
      if (!eql(match, val[key])) {
        return false;
      }
      keys[i] = true;
    }
    for (key in val) {
      if (!hasProp.call(val, key)) continue;
      if (!keys[key]) {
        return false;
      }
    }
    return true;
  }
};

module.exports = eql;
