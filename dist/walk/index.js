var isPlainObject, walk, walkArray, walkObject,
  hasProp = {}.hasOwnProperty;

isPlainObject = function(obj) {
  return typeof obj === 'object' && obj !== null && obj.constructor === Object;
};

walkObject = function(object, handler) {
  var interpolatedKey, interpolatedResult, key, result, value;
  if (Array.isArray(object)) {
    return walkArray(object, handler);
  }
  result = {};
  for (key in object) {
    if (!hasProp.call(object, key)) continue;
    interpolatedKey = walk(key, handler, true);
    if (interpolatedKey.length) {
      interpolatedResult = walk(object[key], handler);
      if (typeof interpolatedResult === 'string' || !isPlainObject(interpolatedResult)) {
        result[interpolatedKey] = interpolatedResult;
      } else {
        value = walk(interpolatedResult, handler);
        result[interpolatedKey] = value;
      }
    }
  }
  return result;
};

walkArray = function(array, handler) {
  return array.map(function(input) {
    return walk(input, handler);
  });
};

walk = function(input, handler, isKey) {
  if (isKey == null) {
    isKey = false;
  }
  if (!input) {
    return input;
  }
  if (Array.isArray(input)) {
    return walkArray(input, handler);
  } else if (isPlainObject(input)) {
    return walkObject(input, handler);
  } else if (typeof input === 'string') {
    return handler(input, isKey);
  } else {
    return input;
  }
};

module.exports = walk;
