var Interpolate, PolicyRun, PolicyRunCondition, debug, filter, ops, update,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  hasProp = {}.hasOwnProperty;

debug = require('debug')('rules:runner');

filter = require('./filter');

update = require('./update');

ops = require('./ops');

Interpolate = require('./interpolate');

PolicyRunCondition = (function() {
  function PolicyRunCondition(data1, arg) {
    var fn;
    this.data = data1;
    this.description = arg.description, this.before = arg.before, this["if"] = arg["if"], this.then = arg.then, this["else"] = arg["else"];
    this.process = bind(this.process, this);
    this.interpolate = new Interpolate(this.data);
    this.logs = [];
    this.run('before');
    if (!this["if"]) {
      this.run('then');
      return;
    }
    this.log(' if');
    fn = (function(_this) {
      return function(item) {
        return _this.match(item);
      };
    })(this);
    if (Array.isArray(this["if"].or)) {
      this.process(this["if"].or.some(fn));
    } else if (Array.isArray(this["if"].and)) {
      this.process(this["if"].and.every(fn));
    } else if (Array.isArray(this["if"])) {
      this.process(this["if"].every(fn));
    } else {
      this.process(fn(this["if"]));
    }
  }

  PolicyRunCondition.prototype.log = function(msg) {
    if (!this.debug) {
      return;
    }
    return this.logs.push(msg);
  };

  PolicyRunCondition.prototype.process = function(bool) {
    if (bool) {
      this.run('then');
    } else {
      this.run('else');
    }
    return this.run('after');
  };

  PolicyRunCondition.prototype.run = function(type) {
    var step;
    step = this[type];
    if (!step) {
      return;
    }
    this.log(' ' + type);
    if (step["if"]) {
      return this.log(new PolicyRunCondition(this.data, step));
    } else {
      return this.outcomes(step);
    }
  };

  PolicyRunCondition.prototype.match = function(tests) {
    var result, where;
    if (tests == null) {
      tests = {};
    }
    where = this.walk(tests);
    result = filter(this.data, where);
    this.log(JSON.stringify(this.data));
    this.log(JSON.stringify(where));
    if (typeof result !== 'string') {
      this.log('   > ' + JSON.stringify(result), where);
    } else {
      this.log('   > ' + result, where);
    }
    return result;
  };

  PolicyRunCondition.prototype.walk = function(obj) {
    return this.interpolate.walk(obj, function(val, isKey) {
      var processed;
      if (!isKey) {
        return val;
      }
      if (ops.indexOf(val) !== -1) {
        return val;
      }
      processed = val.startsWith('context.' || val.startsWith('scope.'));
      if (val[0] === '@') {
        return 'context.' + val.substring(1);
      } else if (processed) {
        return val;
      } else {
        return 'scope.' + val;
      }
    });
  };

  PolicyRunCondition.prototype.outcomes = function(outcomes) {
    var data, result;
    if (outcomes == null) {
      outcomes = {};
    }
    data = this.walk(outcomes);
    result = update(data, this.data);
    if (typeof result !== 'string') {
      this.log('   > ' + JSON.stringify(result), data);
    } else {
      this.log('   > ' + result, data);
    }
    return result;
  };

  return PolicyRunCondition;

})();

PolicyRun = (function() {
  function PolicyRun(conditions, data) {
    var m, runs;
    if (debug.enabled) {
      m = data.context.id + ':\n';
      m += 'data\n';
      m += ' context\n';
      m += this.objToString(data.context);
      m += ' scope\n';
      m += this.objToString(data.scope);
      m += 'conditions\n';
    }
    runs = conditions.map(function(rule) {
      return new PolicyRunCondition(data, rule);
    });
    if (debug.enabled) {
      m += this.flush(runs, data);
      m += 'result\n';
      m += ' context\n';
      m += this.objToString(data.context);
      m += ' scope\n';
      m += this.objToString(data.scope);
      debug(m);
    }
    return data.context;
  }

  PolicyRun.prototype.objToString = function(obj, prefix) {
    var p, str, v;
    if (prefix == null) {
      prefix = '';
    }
    str = '';
    for (p in obj) {
      if (!hasProp.call(obj, p)) continue;
      v = obj[p];
      str += ' - ' + prefix + p + ': ' + ((v != null ? typeof v.toString === "function" ? v.toString() : void 0 : void 0) || v) + '\n';
    }
    return str;
  };

  PolicyRun.prototype.flush = function(items, arg) {
    var context, handle, m, scope;
    context = arg.context, scope = arg.scope;
    m = '';
    handle = function(arg1) {
      var logs;
      logs = arg1.logs;
      return logs.map(function(log) {
        if (log instanceof PolicyRunCondition) {
          return handle(log);
        } else {
          return log;
        }
      }).join('\n');
    };
    items.forEach(function(item, idx) {
      m += ' #' + idx;
      if (item.description) {
        m += ' - ' + item.description;
      }
      m += '\n';
      m += handle(item);
      return m += '\n';
    });
    return m;
  };

  return PolicyRun;

})();

module.exports = function(conditions, scope, context) {
  if (scope == null) {
    scope = {};
  }
  if (context == null) {
    context = {};
  }
  if (!Array.isArray(conditions) || !conditions.length) {
    return context;
  }
  return new PolicyRun(conditions, {
    context: context,
    scope: scope
  });
};
