var eql, ops;

eql = require('./eql');

ops = require('./ops');

module.exports = function(matcher, val) {
  var first, i, key, keys, len, op;
  if (matcher !== Object(matcher)) {
    return eql(matcher, val);
  }
  keys = Object.keys(matcher);
  first = keys[0];
  if (!ops[first || '$' + first]) {
    return eql(matcher, val);
  }
  for (i = 0, len = keys.length; i < len; i++) {
    key = keys[i];
    op = ops[key || '$' + key];
    return op(matcher[key], val);
  }
  return true;
};
