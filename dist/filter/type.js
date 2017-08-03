module.exports = function(val) {
  switch (Object.prototype.toString.call(val)) {
    case '[object Function]':
      return 'function';
    case '[object Date]':
      return 'date';
    case '[object RegExp]':
      return 'regexp';
    case '[object Arguments]':
      return 'arguments';
    case '[object Array]':
      return 'array';
  }
  if (val === null) {
    return 'null';
  }
  if (val === void 0) {
    return 'undefined';
  }
  if (val === Object(val)) {
    return 'object';
  }
  return typeof val;
};
