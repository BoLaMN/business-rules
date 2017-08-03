var compare, filter,
  hasProp = {}.hasOwnProperty;

compare = require('./compare');

filter = function(obj, query) {
  var check, i, j, key, len, matches, part, parts, prefix, search, target, val;
  if (obj == null) {
    obj = {};
  }
  check = function(val) {
    return filter(obj, val);
  };
  for (key in query) {
    if (!hasProp.call(query, key)) continue;
    val = query[key];
    if (key === '$and' || key === 'and') {
      return val.every(check);
    } else if (key === '$or' || key === 'or') {
      return val.some(check);
    } else if (key === '$nor' || key === 'nor') {
      return !val.some(check);
    }
    target = obj;
    parts = key.split('.');
    for (i = j = 0, len = parts.length; j < len; i = ++j) {
      part = parts[i];
      target = target[part];
      if (target === void 0) {
        return false;
      } else if (Array.isArray(target)) {
        prefix = parts.slice(0, i + 1).join('.');
        search = parts.slice(i + 1).join('.');
        if (val.$size && !search.length) {
          return compare(val, target);
        }
        matches = target.filter(function(subkey) {
          var k, obj1;
          if (!search.length && compare(val, subkey)) {
            k = subkey;
          } else if (subkey === Object(subkey)) {
            if (filter(subkey, (
              obj1 = {},
              obj1["" + search] = val,
              obj1
            ))) {
              k = subkey;
            }
          }
          return !target || !~target.indexOf(k);
        });
        return matches.length > 0;
      } else if (typeof target === 'object') {
        if (parts[i + 1]) {
          continue;
        } else {
          return compare(val, target);
        }
      } else {
        return compare(val, target);
      }
    }
  }
  return false;
};

module.exports = filter;
