var eql, get, globals, map, parent, prefixed, prop, props, type, unique, walk,
  hasProp = {}.hasOwnProperty;

parent = function(obj, key, init) {
  var i, pieces, ret;
  if (~key.indexOf('.')) {
    pieces = key.split('.');
    ret = obj;
    i = 0;
    while (i < pieces.length - 1) {
      if (type(ret) === 'array') {
        ret = ret[pieces[i]];
      } else if ('object' === type(ret)) {
        if (init && !ret.hasOwnProperty(pieces[i])) {
          ret[pieces[i]] = {};
        }
        if (ret) {
          ret = ret[pieces[i]];
        }
      }
      i++;
    }
    return ret;
  } else {
    return obj;
  }
};

get = function(obj, path) {
  var key, par, ref;
  if (~path.indexOf('.')) {
    par = parent(obj, path);
    key = path.split('.').pop();
    if ((ref = type(par)) === 'object' || ref === 'array') {
      return par[key];
    }
  } else {
    return obj[path];
  }
};

type = function(val) {
  var isBuffer, toString;
  toString = Object.prototype.toString;
  isBuffer = function(obj) {
    return !!(obj !== null && (obj._isBuffer || obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)));
  };
  switch (toString.call(val)) {
    case '[object Date]':
      return 'date';
    case '[object RegExp]':
      return 'regexp';
    case '[object Arguments]':
      return 'arguments';
    case '[object Array]':
      return 'array';
    case '[object Error]':
      return 'error';
  }
  if (val === null) {
    return 'null';
  }
  if (val === void 0) {
    return 'undefined';
  }
  if (val !== val) {
    return 'nan';
  }
  if (val && val.nodeType === 1) {
    return 'element';
  }
  if (isBuffer(val)) {
    return 'buffer';
  }
  val = val.valueOf ? val.valueOf() : Object.prototype.valueOf.apply(val);
  return typeof val;
};

eql = function(matcher, val) {
  var i, j, keys, len, match;
  if ((matcher != null ? matcher._bsontype : void 0) && (val != null ? val._bsontype : void 0)) {
    return matcher.equals(val);
  }
  matcher = matcher != null ? typeof matcher.toString === "function" ? matcher.toString() : void 0 : void 0;
  val = val != null ? typeof val.toString === "function" ? val.toString() : void 0 : void 0;
  switch (type(matcher)) {
    case 'null':
    case 'undefined':
      return null === val || val === void 0;
    case 'regexp':
      return matcher.test(val);
    case 'array':
      if ('array' === type(val) && matcher.length === val.length) {
        for (i = j = 0, len = matcher.length; j < len; i = ++j) {
          match = matcher[i];
          if (!eql(val[i], match)) {
            return false;
          }
        }
        return true;
      } else {
        return false;
      }
      break;
    case 'object':
      keys = {};
      for (i in matcher) {
        if (!hasProp.call(matcher, i)) continue;
        if (!val.hasOwnProperty(i) || !eql(matcher[i], val[i])) {
          return false;
        }
        keys[i] = true;
      }
      for (i in val) {
        if (!hasProp.call(val, i)) continue;
        if (!keys.hasOwnProperty(i)) {
          return false;
        }
      }
      return true;
    default:
      return matcher === val;
  }
};

globals = /\b(this|Array|Date|Object|Math|JSON)\b/g;

prop = function(str) {
  return str.replace(/\.\w+|\w+ *\(|"[^"]*"|'[^']*'|\/([^\/]+)\//g, '').replace(globals, '').match(/[$a-zA-Z_]\w*/g) || [];
};

map = function(str, props, fn) {
  var re;
  re = /\.\w+|\w+ *\(|"[^"]*"|'[^']*'|\/([^\/]+)\/|[a-zA-Z_]\w*/g;
  return str.replace(re, function(_) {
    if ('(' === _[_.length - 1]) {
      return fn(_);
    }
    if (!~props.indexOf(_)) {
      return _;
    }
    return fn(_);
  });
};

unique = function(arr) {
  var i, ret;
  ret = [];
  i = 0;
  while (i < arr.length) {
    if (~ret.indexOf(arr[i])) {
      i++;
      continue;
    }
    ret.push(arr[i]);
    i++;
  }
  return ret;
};

prefixed = function(str) {
  return function(_) {
    return str + _;
  };
};

props = function(str, fn) {
  var p;
  p = unique(prop(str));
  if (fn && 'string' === typeof fn) {
    fn = prefixed(fn);
  }
  if (fn) {
    return map(str, p, fn);
  }
  return p;
};

walk = function(input, handler) {
  var iterate, plain;
  plain = function(obj) {
    return typeof obj === 'object' && obj !== null && obj.constructor === Object;
  };
  iterate = function(item, isKey) {
    var key, okey, val;
    if (isKey == null) {
      isKey = false;
    }
    if (Array.isArray(item)) {
      return item.map(iterate);
    } else if (plain(item)) {
      for (key in item) {
        if (!hasProp.call(item, key)) continue;
        val = item[key];
        okey = key;
        key = iterate(key, true);
        item[key] = iterate(val);
        if (okey !== key) {
          delete item[okey];
        }
      }
      return item;
    } else if (typeof item === 'string') {
      return handler(item, isKey);
    } else {
      return item;
    }
  };
  return iterate(input);
};

module.exports = {
  props: props,
  unique: unique,
  walk: walk,
  parent: parent,
  get: get,
  type: type,
  eql: eql
};
