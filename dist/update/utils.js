var compare, compareArray, compareThings, isDate;

isDate = function(obj) {
  return Object.prototype.toString.call(obj) === '[object Date]';
};

compare = function(a, b) {
  if (a === b) {
    return 0;
  }
  if (typeof a === typeof b) {
    if (a > b) {
      return 1;
    }
    if (a < b) {
      return -1;
    }
  }
};

compareThings = function(a, b, _compareStrings) {
  var aKeys, bKeys, comp, compareStrings, i;
  compareStrings = _compareStrings || compare;
  if (a === void 0) {
    if (b === void 0) {
      return 0;
    } else {
      return -1;
    }
  }
  if (b === void 0) {
    if (a === void 0) {
      return 0;
    } else {
      return 1;
    }
  }
  if (a === null) {
    if (b === null) {
      return 0;
    } else {
      return -1;
    }
  }
  if (b === null) {
    if (a === null) {
      return 0;
    } else {
      return 1;
    }
  }
  if (typeof a === 'number') {
    if (typeof b === 'number') {
      return compare(a, b);
    } else {
      return -1;
    }
  }
  if (typeof b === 'number') {
    if (typeof a === 'number') {
      return compare(a, b);
    } else {
      return 1;
    }
  }
  if (typeof a === 'string') {
    if (typeof b === 'string') {
      return compareStrings(a, b);
    } else {
      return -1;
    }
  }
  if (typeof b === 'string') {
    if (typeof a === 'string') {
      return compareStrings(a, b);
    } else {
      return 1;
    }
  }
  if (typeof a === 'boolean') {
    if (typeof b === 'boolean') {
      return compare(a, b);
    } else {
      return -1;
    }
  }
  if (typeof b === 'boolean') {
    if (typeof a === 'boolean') {
      return compare(a, b);
    } else {
      return 1;
    }
  }
  if (isDate(a)) {
    if (isDate(b)) {
      return compare(a.getTime(), b.getTime());
    } else {
      return -1;
    }
  }
  if (isDate(b)) {
    if (isDate(a)) {
      return compare(a.getTime(), b.getTime());
    } else {
      return 1;
    }
  }
  if (Array.isArray(a)) {
    if (Array.isArray(b)) {
      return compareArrays(a, b);
    } else {
      return -1;
    }
  }
  if (Array.isArray(b)) {
    if (Array.isArray(a)) {
      return compareArrays(a, b);
    } else {
      return 1;
    }
  }
  aKeys = Object.keys(a).sort();
  bKeys = Object.keys(b).sort();
  i = 0;
  while (i < Math.min(aKeys.length, bKeys.length)) {
    comp = compareThings(a[aKeys[i]], b[bKeys[i]]);
    if (comp !== 0) {
      return comp;
    }
    i += 1;
  }
  return compare(aKeys.length, bKeys.length);
};

compareArray = function(a, b) {
  var comp, i;
  i = 0;
  while (i < Math.min(a.length, b.length)) {
    comp = compareThings(a[i], b[i]);
    if (comp !== 0) {
      return comp;
    }
    i += 1;
  }
  return compare(a.length, b.length);
};

module.exports = compareThings;
