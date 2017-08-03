var globals, map, prefixed, prop, unique;

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

module.exports = {
  parse: function(str, scope, context) {
    var expression, re, regex;
    regex = RegExp(' *\\| *');
    re = RegExp("{([^\"|]*)}|\"([^\"|:]*)\"|'([^'|]*)'|([^\t(,|:)]+)", 'g');
    expression = require('./expression');
    return str.split(regex).map(function(call) {
      var compiled, name, parts;
      parts = call.match(re);
      name = parts.shift();
      compiled = parts.map(function(expr) {
        var e, fn, val;
        fn = new expression(expr);
        try {
          val = fn.exec(scope, context);
        } catch (error) {
          e = error;
          console.error(expr, e.message);
          val = expr;
        }
        return val;
      });
      return {
        name: name,
        args: compiled
      };
    });
  },
  props: function(str, fn) {
    var p;
    p = unique(prop(str));
    if (fn && 'string' === typeof fn) {
      fn = prefixed(fn);
    }
    if (fn) {
      return map(str, p, fn);
    }
    return p;
  },
  unique: unique
};
