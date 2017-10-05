var debug, eql, filter, get, has, numeric, ops, parent, pull, ref, type, update;

debug = require('debug')('filter:update');

filter = require('./filter');

ref = require('./utils'), type = ref.type, eql = ref.eql, parent = ref.parent, get = ref.get;


/**
 * Helper for determining if an array has the given value.
 *
 * @param {Array} array
 * @param {Object} value to check
 * @return {Boolean}
 */

has = function(array, val) {
  var i, l;
  i = 0;
  l = array.length;
  while (i < l) {
    if (eql(val, array[i])) {
      return true;
    }
    i++;
  }
  return false;
};


/**
 * Array#filter function generator for `$pull`/`$pullAll` operations.
 *
 * @param {Array} array of values to match
 * @param {Array} array to populate with results
 * @return {Function} that splices the array
 */

pull = function(arr, vals, pulled) {
  var a, i, indexes, match, matcher, val;
  indexes = [];
  a = 0;
  while (a < arr.length) {
    val = arr[a];
    i = 0;
    while (i < vals.length) {
      matcher = vals[i];
      if ('object' === type(matcher)) {
        if ('object' === type(val)) {
          match = false;
          if (Object.keys(matcher).length) {
            for (i in matcher) {
              if (matcher.hasOwnProperty(i)) {
                if (eql(matcher[i], val[i])) {
                  match = true;
                } else {
                  match = false;
                  break;
                }
              }
            }
          } else if (!Object.keys(val).length) {
            match = true;
          }
          if (match) {
            indexes.push(a);
            pulled.push(val);
            i++;
            continue;
          }
        } else {
          debug('ignoring pull match against object');
        }
      } else {
        if (eql(matcher, val)) {
          indexes.push(a);
          pulled.push(val);
          i++;
          continue;
        }
      }
      i++;
    }
    a++;
  }
  return function() {
    var index;
    i = 0;
    while (i < indexes.length) {
      index = indexes[i];
      arr.splice(index - i, 1);
      i++;
    }
  };
};


/**
 * Helper to determine if a value is numeric.
 *
 * @param {String|Number} value
 * @return {Boolean} true if numeric
 * @api private
 */

numeric = function(val) {
  return 'number' === type(val) || Number(val) === val || !isNaN(val) && !isNaN(parseFloat(val));
};

ops = {
  $set: function(obj, path, val) {
    var key;
    key = path.split('.').pop();
    obj = parent(obj, path, true);
    switch (type(obj)) {
      case 'object':
        if (!eql(obj[key], val)) {
          return function() {
            obj[key] = val;
            return val;
          };
        }
        break;
      case 'array':
        if (numeric(key)) {
          if (!eql(obj[key], val)) {
            return function() {
              obj[key] = val;
              return val;
            };
          }
        } else {
          throw new Error('can\'t append to array using string field name [' + key + ']');
        }
        break;
      default:
        throw new Error('$set only supports object not ' + type(obj));
    }
  },

  /**
   * Performs an `$unset`.
   *
   * @param {Object} object to modify
   * @param {String} path to alter
   * @param {String} value to set
   * @return {Function} transaction (unless noop)
   */
  $unset: function(obj, path) {
    var key;
    key = path.split('.').pop();
    obj = parent(obj, path);
    switch (type(obj)) {
      case 'array':
      case 'object':
        if (obj.hasOwnProperty(key)) {
          return function() {
            delete obj[key];
          };
        } else {
          debug('ignoring unset of inexisting key');
        }
    }
  },

  /**
   * Performs a `$rename`.
   *
   * @param {Object} object to modify
   * @param {String} path to alter
   * @param {String} value to set
   * @return {Function} transaction (unless noop)
   */
  $rename: function(obj, path, newKey) {
    var key, p, t;
    if (path === newKey) {
      throw new Error('$rename source must differ from target');
    }
    if (0 === path.indexOf(newKey + '.')) {
      throw new Error('$rename target may not be a parent of source');
    }
    p = parent(obj, path);
    t = type(p);
    if ('object' === t) {
      key = path.split('.').pop();
      if (p.hasOwnProperty(key)) {
        return function() {
          var newp, val;
          val = p[key];
          delete p[key];
          newp = parent(obj, newKey, true);
          if ('object' === type(newp)) {
            newp[newKey.split('.').pop()] = val;
          } else {
            debug('invalid $rename target path type');
          }
          return newKey;
        };
      } else {
        debug('ignoring rename from inexisting source');
      }
    } else if ('undefined' !== t) {
      throw new Error('$rename source field invalid');
    }
  },

  /**
   * Performs an `$inc`.
   *
   * @param {Object} object to modify
   * @param {String} path to alter
   * @param {String} value to set
   * @return {Function} transaction (unless noop)
   */
  $inc: function(obj, path, inc) {
    var key;
    if ('number' !== type(inc)) {
      throw new Error('Modifier $inc allowed for numbers only');
    }
    obj = parent(obj, path, true);
    key = path.split('.').pop();
    switch (type(obj)) {
      case 'array':
      case 'object':
        if (obj.hasOwnProperty(key)) {
          if ('number' !== type(obj[key])) {
            throw new Error('Cannot apply $inc modifier to non-number');
          }
          return function() {
            obj[key] += inc;
            return inc;
          };
        } else if ('object' === type(obj) || numeric(key)) {
          return function() {
            obj[key] = inc;
            return inc;
          };
        } else {
          throw new Error('can\'t append to array using string field name [' + key + ']');
        }
        break;
      default:
        throw new Error('Cannot apply $inc modifier to non-number');
    }
  },

  /**
   * Performs an `$pop`.
   *
   * @param {Object} object to modify
   * @param {String} path to alter
   * @param {String} value to set
   * @return {Function} transaction (unless noop)
   */
  $pop: function(obj, path, val) {
    var key;
    obj = parent(obj, path);
    key = path.split('.').pop();
    switch (type(obj)) {
      case 'array':
      case 'object':
        if (obj.hasOwnProperty(key)) {
          switch (type(obj[key])) {
            case 'array':
              if (obj[key].length) {
                return function() {
                  if (-1 === val) {
                    return obj[key].shift();
                  } else {
                    return obj[key].pop();
                  }
                };
              }
              break;
            case 'undefined':
              debug('ignoring pop to inexisting key');
              break;
            default:
              throw new Error('Cannot apply $pop modifier to non-array');
          }
        } else {
          debug('ignoring pop to inexisting key');
        }
        break;
      case 'undefined':
        debug('ignoring pop to inexisting key');
    }
  },

  /**
   * Performs a `$push`.
   *
   * @param {Object} object to modify
   * @param {String} path to alter
   * @param {Object} value to push
   * @return {Function} transaction (unless noop)
   */
  $push: function(obj, path, val) {
    var key;
    obj = parent(obj, path, true);
    key = path.split('.').pop();
    switch (type(obj)) {
      case 'object':
        if (obj.hasOwnProperty(key)) {
          if ('array' === type(obj[key])) {
            return function() {
              obj[key].push(val);
              return val;
            };
          } else {
            throw new Error('Cannot apply $push/$pushAll modifier to non-array');
          }
        } else {
          return function() {
            obj[key] = [val];
            return val;
          };
        }
        break;
      case 'array':
        if (obj.hasOwnProperty(key)) {
          if ('array' === type(obj[key])) {
            return function() {
              obj[key].push(val);
              return val;
            };
          } else {
            throw new Error('Cannot apply $push/$pushAll modifier to non-array');
          }
        } else if (numeric(key)) {
          return function() {
            obj[key] = [val];
            return val;
          };
        } else {
          throw new Error('can\'t append to array using string field name [' + key + ']');
        }
    }
  },

  /**
   * Performs a `$pushAll`.
   *
   * @param {Object} object to modify
   * @param {String} path to alter
   * @param {Array} values to push
   * @return {Function} transaction (unless noop)
   */
  $pushAll: function(obj, path, val) {
    var key;
    if ('array' !== type(val)) {
      throw new Error('Modifier $pushAll/pullAll allowed for arrays only');
    }
    obj = parent(obj, path, true);
    key = path.split('.').pop();
    switch (type(obj)) {
      case 'object':
        if (obj.hasOwnProperty(key)) {
          if ('array' === type(obj[key])) {
            return function() {
              obj[key].push.apply(obj[key], val);
              return val;
            };
          } else {
            throw new Error('Cannot apply $push/$pushAll modifier to non-array');
          }
        } else {
          return function() {
            obj[key] = val;
            return val;
          };
        }
        break;
      case 'array':
        if (obj.hasOwnProperty(key)) {
          if ('array' === type(obj[key])) {
            return function() {
              obj[key].push.apply(obj[key], val);
              return val;
            };
          } else {
            throw new Error('Cannot apply $push/$pushAll modifier to non-array');
          }
        } else if (numeric(key)) {
          return function() {
            obj[key] = val;
            return val;
          };
        } else {
          throw new Error('can\'t append to array using string field name [' + key + ']');
        }
    }
  },

  /**
   * Performs a `$pull`.
   */
  $pull: function(obj, path, val) {
    var key, pulled, splice, t;
    obj = parent(obj, path, true);
    key = path.split('.').pop();
    t = type(obj);
    switch (t) {
      case 'object':
        if (obj.hasOwnProperty(key)) {
          if ('array' === type(obj[key])) {
            pulled = [];
            splice = pull(obj[key], [val], pulled);
            if (pulled.length) {
              return function() {
                splice();
                return pulled;
              };
            }
          } else {
            throw new Error('Cannot apply $pull/$pullAll modifier to non-array');
          }
        }
        break;
      case 'array':
        if (obj.hasOwnProperty(key)) {
          if ('array' === type(obj[key])) {
            pulled = [];
            splice = pull(obj[key], [val], pulled);
            if (pulled.length) {
              return function() {
                splice();
                return pulled;
              };
            }
          } else {
            throw new Error('Cannot apply $pull/$pullAll modifier to non-array');
          }
        } else {
          debug('ignoring pull to non array');
        }
        break;
      default:
        if ('undefined' !== t) {
          throw new Error('LEFT_SUBFIELD only supports Object: hello not: ' + t);
        }
    }
  },

  /**
   * Performs a `$pullAll`.
   */
  $pullAll: function(obj, path, val) {
    var key, pulled, splice, t;
    if ('array' !== type(val)) {
      throw new Error('Modifier $pushAll/pullAll allowed for arrays only');
    }
    obj = parent(obj, path, true);
    key = path.split('.').pop();
    t = type(obj);
    switch (t) {
      case 'object':
        if (obj.hasOwnProperty(key)) {
          if ('array' === type(obj[key])) {
            pulled = [];
            splice = pull(obj[key], val, pulled);
            if (pulled.length) {
              return function() {
                splice();
                return pulled;
              };
            }
          } else {
            throw new Error('Cannot apply $pull/$pullAll modifier to non-array');
          }
        }
        break;
      case 'array':
        if (obj.hasOwnProperty(key)) {
          if ('array' === type(obj[key])) {
            pulled = [];
            splice = pull(obj[key], val, pulled);
            if (pulled.length) {
              return function() {
                splice();
                return pulled;
              };
            }
          } else {
            throw new Error('Cannot apply $pull/$pullAll modifier to non-array');
          }
        } else {
          debug('ignoring pull to non array');
        }
        break;
      default:
        if ('undefined' !== t) {
          throw new Error('LEFT_SUBFIELD only supports Object: hello not: ' + t);
        }
    }
  },

  /**
   * Performs a `$addToSet`.
   *
   * @param {Object} object to modify
   * @param {String} path to alter
   * @param {Object} value to push
   * @param {Boolean} internal, true if recursing
   * @return {Function} transaction (unless noop)
   */
  $addToSet: function(obj, path, val, recursing) {
    var fn, fns, i, key, l;
    if (!recursing && 'array' === type(val.$each)) {
      fns = [];
      i = 0;
      l = val.$each.length;
      while (i < l) {
        fn = this.$addToSet(obj, path, val.$each[i], true);
        if (fn) {
          fns.push(fn);
        }
        i++;
      }
      if (fns.length) {
        return function() {
          var values;
          values = [];
          i = 0;
          while (i < fns.length) {
            values.push(fns[i]());
            i++;
          }
          return values;
        };
      } else {
        return;
      }
    }
    obj = parent(obj, path, true);
    key = path.split('.').pop();
    switch (type(obj)) {
      case 'object':
        if (obj.hasOwnProperty(key)) {
          if ('array' === type(obj[key])) {
            if (!has(obj[key], val)) {
              return function() {
                obj[key].push(val);
                return val;
              };
            }
          } else {
            throw new Error('Cannot apply $addToSet modifier to non-array');
          }
        } else {
          return function() {
            obj[key] = [val];
            return val;
          };
        }
        break;
      case 'array':
        if (obj.hasOwnProperty(key)) {
          if ('array' === type(obj[key])) {
            if (!has(obj[key], val)) {
              return function() {
                obj[key].push(val);
                return val;
              };
            }
          } else {
            throw new Error('Cannot apply $addToSet modifier to non-array');
          }
        } else if (numeric(key)) {
          return function() {
            obj[key] = [val];
            return val;
          };
        } else {
          throw new Error('can\'t append to array using string field name [' + key + ']');
        }
    }
  }
};


/**
 * Execute a update.
 *
 * Options:
 *  - `strict` only modify if query matches
 *
 * @param {Object} object to alter
 * @param {Object} query to filter modifications by
 * @param {Object} update object
 * @param {Object} options
 */

update = function(data, match, update) {
  var fn, index, j, key, len, log, mod, op, pos, prefix, suffix, transactions, val;
  if (data == null) {
    data = {};
  }
  if (update == null) {
    update = {};
  }
  log = [];
  transactions = [];
  for (op in update) {
    mod = update[op];
    if (ops[op]) {
      for (key in mod) {
        val = mod[key];
        pos = key.indexOf('.$.');
        if (~pos) {
          prefix = key.substr(0, pos);
          suffix = key.substr(pos + 3);
          if (match[prefix]) {
            debug('executing "%s" %s on first match within "%s"', key, op, prefix);
            fn = ops[op](match[prefix][0], suffix, val);
            if (fn) {
              index = get(data, prefix).indexOf(match[prefix][0]);
              fn.key = prefix + '.' + index + '.' + suffix;
              fn.op = op;
              transactions.push(fn);
            }
          } else {
            debug('ignoring "%s" %s - no matches within "%s"', key, op, prefix);
          }
        } else {
          fn = ops[op](data, key, val);
          if (fn) {
            fn.key = key;
            fn.op = op;
            transactions.push(fn);
          }
        }
      }
    }
  }
  if (transactions.length) {
    for (j = 0, len = transactions.length; j < len; j++) {
      fn = transactions[j];
      log.push({
        op: fn.op.replace('$', ''),
        key: fn.key,
        from: get(data, fn.key),
        to: fn()
      });
    }
  }
  return log;
};

module.exports = update;

module.exports.ops = Object.keys(ops);
