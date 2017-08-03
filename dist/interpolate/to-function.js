var defaultToFunction, get, objectToFunction, props, regexpToFunction, stringToFunction, stripNested, toFunction;

props = require('./utils').props;

toFunction = function(obj) {
  switch ({}.toString.call(obj)) {
    case '[object Object]':
      return objectToFunction(obj);
    case '[object Function]':
      return obj;
    case '[object String]':
      return stringToFunction(obj);
    case '[object RegExp]':
      return regexpToFunction(obj);
    default:
      return defaultToFunction(obj);
  }
};

defaultToFunction = function(val) {
  return function(obj) {
    return val === obj;
  };
};

regexpToFunction = function(re) {
  return function(obj) {
    return re.test(obj);
  };
};

stringToFunction = function(str) {
  if (/^ *\W+/.test(str)) {
    return new Function('_', 'return _ ' + str);
  }
  return new Function('_', 'return ' + get(str));
};

objectToFunction = function(obj) {
  var key, match, value;
  match = {};
  for (key in obj) {
    value = obj[key];
    match[key] = typeof value === 'string' ? defaultToFunction(value) : toFunction(value);
  }
  return function(val) {
    if (typeof val !== 'object') {
      return false;
    }
    for (key in match) {
      value = match[key];
      if (!val[key]) {
        return false;
      }
      if (!value(val[key])) {
        return false;
      }
    }
    return true;
  };
};

get = function(str) {
  var i, len, prop, ps, val;
  ps = props(str);
  if (!ps.length) {
    return '_.' + str;
  }
  for (i = 0, len = ps.length; i < len; i++) {
    prop = ps[i];
    val = '_.' + prop;
    val = "('function' == typeof " + val + " ? " + val + "() : " + val + ")";
    str = stripNested(prop, str, val);
  }
  return str;
};

stripNested = function(prop, str, val) {
  return str.replace(new RegExp('(\\.)?' + prop, 'g'), function($0, $1) {
    if ($1) {
      return $0;
    } else {
      return val;
    }
  });
};

module.exports = toFunction;
