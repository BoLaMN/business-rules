var modify, ops;

ops = require('./ops');

modify = function(obj, field, value) {
  var parts;
  parts = typeof field === 'string' ? field.split('.') : field;
  if (parts.length === 1) {
    return (function(_this) {
      return function(m) {
        var modder;
        modder = ops[m].bind(_this);
        return modder(obj, field, value);
      };
    })(this);
  }
  return (function(_this) {
    return function(m) {
      var modder;
      if (obj[parts[0]] === void 0) {
        if (m === '$unset') {
          return;
        }
        obj[parts[0]] = {};
      }
      modder = ops[m].bind(_this);
      return modder(obj[parts[0]], parts.slice(1), value);
    };
  })(this);
};

module.exports = function(data, doc) {
  var forceSet, keys, mods;
  mods = Object.keys(data);
  forceSet = mods.filter(function(mod) {
    return mod[0] === '$';
  });
  if (!forceSet.length) {
    keys = Object.keys(data);
    keys.forEach(function(k) {
      return modify(doc, k, data[k])('$set');
    });
  } else {
    mods.forEach(function(modifier) {
      if (!ops[modifier]) {
        throw new Error('Unknown modifier ' + modifier);
      }
      if (typeof data[modifier] !== 'object') {
        throw new Error('Modifier ' + modifier + '\'s argument must be an object');
      }
      keys = Object.keys(data[modifier]);
      return keys.forEach(function(k) {
        return modify(doc, k, data[modifier][k])(modifier);
      });
    });
  }
  return doc;
};
