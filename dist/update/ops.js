var compare, debug;

debug = require('debug')('rules:update:ops');

compare = require('./utils');

module.exports = {
  $set: function(obj, field, value) {
    obj[field] = value;
  },
  $unset: function(obj, field, value) {
    delete obj[field];
  },
  $push: function(obj, field, value) {
    var end, keys, n, start;
    if (!obj.hasOwnProperty(field)) {
      obj[field] = [];
    }
    if (!Array.isArray(obj[field])) {
      throw new Error('Can\'t $push an element on non-array values');
    }
    if (value !== null && typeof value === 'object') {
      if (value.$slice && value.$each === void 0) {
        value.$each = [];
      }
    } else {
      if (!value.$each) {
        return obj[field].push(value);
      }
    }
    keys = Object.keys(value);
    if (keys.length >= 3 || keys.length === 2 && value.$slice === void 0) {
      throw new Error('only use $slice with $each when $push to array');
    }
    if (!Array.isArray(value.$each)) {
      throw new Error('$each requires an array value');
    }
    value.$each.forEach(function(v) {
      return obj[field].push(v);
    });
    if (value.$slice === void 0 || typeof value.$slice !== 'number') {
      return;
    }
    if (value.$slice === 0) {
      obj[field] = [];
    } else {
      n = obj[field].length;
      if (value.$slice < 0) {
        start = Math.max(0, n + value.$slice);
        end = n;
      } else if (value.$slice > 0) {
        start = 0;
        end = Math.min(n, value.$slice);
      }
      obj[field] = obj[field].slice(start, end);
    }
  },
  $addToSet: function(obj, field, value) {
    var addToSet;
    addToSet = true;
    if (!obj.hasOwnProperty(field)) {
      obj[field] = [];
    }
    if (!Array.isArray(obj[field])) {
      throw new Error('Can\'t $addToSet an element on non-array values');
    }
    if (value !== null && typeof value === 'object' && value.$each) {
      if (Object.keys(value).length > 1) {
        throw new Error('Can\'t use another field in conjunction with $each');
      }
      if (!Array.isArray(value.$each)) {
        throw new Error('$each requires an array value');
      }
      value.$each.forEach((function(_this) {
        return function(v) {
          _this.$addToSet(obj, field, v);
        };
      })(this));
    } else {
      obj[field].forEach(function(v) {
        if (compare(v, value) === 0) {
          return addToSet = false;
        }
      });
      if (addToSet) {
        obj[field].push(value);
      }
    }
  },
  $pop: function(obj, field, value) {
    if (!Array.isArray(obj[field])) {
      throw new Error('$pop on element from non-array values');
    }
    if (typeof value !== 'number') {
      throw new Error(value + ' isnt an integer, cant use with $pop');
    }
    if (value === 0) {
      return;
    }
    if (value > 0) {
      obj[field] = obj[field].slice(0, obj[field].length - 1);
    } else {
      obj[field] = obj[field].slice(1);
    }
  },
  $pull: function(obj, field, value) {
    var arr, i;
    if (!Array.isArray(obj[field])) {
      throw new Error('$pull on element from non-array values');
    }
    arr = obj[field];
    i = arr.length - 1;
    while (i >= 0) {
      if (this.matches(arr[i], value)) {
        arr.splice(i, 1);
      }
      i -= 1;
    }
  },
  $inc: function(obj, field, value) {
    if (typeof value !== 'number') {
      throw new Error(value + ' must be a number');
    }
    if (typeof obj[field] !== 'number') {
      if (!obj[field]) {
        obj[field] = value;
      } else {
        throw new Error('$inc modifier on non-number fields');
      }
    } else {
      obj[field] += value;
    }
  },
  $max: function(obj, field, value) {
    if (typeof obj[field] === 'undefined') {
      obj[field] = value;
    } else if (value > obj[field]) {
      obj[field] = value;
    }
  },
  $min: function(obj, field, value) {
    if (typeof obj[field] === 'undefined') {
      obj[field] = value;
    } else if (value < obj[field]) {
      obj[field] = value;
    }
  }
};
