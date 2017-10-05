var Interpolate, PolicyRun, PolicyRunCondition, debug, filter, ops, run, update,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  hasProp = {}.hasOwnProperty;

debug = require('debug')('rules:runner');

filter = require('./filter');

update = require('./update');

ops = require('./ops');

Interpolate = require('./interpolate');

PolicyRunCondition = (function() {
  function PolicyRunCondition(data1, arg) {
    this.data = data1;
    this.description = arg.description, this.before = arg.before, this["if"] = arg["if"], this.then = arg.then, this["else"] = arg["else"];
    this.process = bind(this.process, this);
    this.interpolate = new Interpolate(this.data);
    this.logs = [];
    if (this.before) {
      this.log(' before ');
      this.run(this.before);
    }
    if (this["if"]) {
      this.process(this["if"]);
    } else {
      this.run(this.then);
    }
    if (this.after) {
      this.log(' after');
      this.run(this.after);
    }
  }

  PolicyRunCondition.prototype.log = function(msg) {
    if (!debug.enabled) {
      return;
    }
    return this.logs.push(msg);
  };

  PolicyRunCondition.prototype.process = function(tests) {
    var bool, step, type, where;
    if (!tests) {
      return false;
    }
    where = this.walk(tests);
    bool = this.match(where);
    type = bool ? 'then' : 'else';
    step = this[type];
    if (!step) {
      return;
    }
    return this.run(step, bool);
  };

  PolicyRunCondition.prototype.run = function(step, match) {
    if (step["if"]) {
      return this.log(new PolicyRunCondition(this.data, step));
    } else {
      return this.outcomes(step, match);
    }
  };

  PolicyRunCondition.prototype.match = function(where) {
    var bool, result;
    if (where == null) {
      where = {};
    }
    result = filter(this.data, where);
    bool = !!result;
    this.log('  if ' + JSON.stringify(where) + ' (' + bool + ')');
    return result;
  };

  PolicyRunCondition.prototype.walk = function(obj) {
    return this.interpolate.walk(obj, (function(_this) {
      return function(val, isKey) {
        if (!isKey) {
          return val;
        }
        if (ops.indexOf(val) !== -1) {
          return val;
        }
        if (val.startsWith('context.' || val.startsWith('scope.'))) {
          return val;
        }
        if (val[0] === '@') {
          return 'context.' + val.substring(1);
        } else if (_this.data[val]) {
          return 'scope.' + val;
        }
        return val;
      };
    })(this));
  };

  PolicyRunCondition.prototype.outcomes = function(outcomes, match) {
    var data;
    if (outcomes == null) {
      outcomes = {};
    }
    data = this.walk(outcomes);
    if (typeof data !== 'string') {
      this.log('  then ' + JSON.stringify(data));
    } else {
      this.log('  then ' + data);
    }
    return this.log('  transaction ' + JSON.stringify(update(this.data, match, data)));
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

run = function(conditions, scope, context) {
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

module.exports = run;

module.exports.PolicyRun = PolicyRun;
