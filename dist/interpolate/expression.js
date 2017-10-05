var Expression, parse, props, ref, unique;

ref = require('../utils'), props = ref.props, unique = ref.unique;

parse = require('./cson').parse;

Expression = (function() {
  function Expression(str) {
    this.cache = {};
    this.str = str.replace(/\\u007C\\u007C/g, '||').replace(/(@)(\w+)/g, 'this.$2');
    this.props = unique(props(this.str));
    this.fn = this.compile(this.str, this.props);
  }

  Expression.prototype.values = function(obj, keys) {
    return keys.map(function(key) {
      return obj[key];
    });
  };

  Expression.prototype.compile = function(str, props) {
    var args, fn;
    if (this.cache[str]) {
      return this.cache[str];
    }
    args = props.slice();
    args.push('return ' + parse(str));
    fn = Function.apply(null, args);
    this.cache[str] = fn;
    return fn;
  };

  Expression.prototype.exec = function(scope, context) {
    var args;
    if (scope == null) {
      scope = {};
    }
    args = this.values(scope, this.props);
    return this.fn.apply(context, args);
  };

  Expression.prototype.toString = function() {
    return this.str;
  };

  return Expression;

})();

module.exports = Expression;
