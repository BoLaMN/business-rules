isPlainObject = (obj) ->
  typeof obj is 'object' and obj != null and obj.constructor is Object

walkObject = (object, handler) ->
  if Array.isArray object
    return walkArray object, handler

  result = {}

  for own key of object
    interpolatedKey = walk key, handler, true

    if interpolatedKey.length
      interpolatedResult = walk object[key], handler

      if typeof interpolatedResult is 'string' or not isPlainObject interpolatedResult
        result[interpolatedKey] = interpolatedResult
      else
        value = walk interpolatedResult, handler

        result[interpolatedKey] = value

  result

walkArray = (array, handler) ->
  array.map (input) ->
    walk input, handler

walk = (input, handler, isKey = false) ->
  if not input
    return input

  if Array.isArray input
    walkArray input, handler
  else if isPlainObject input
     walkObject input, handler
  else if typeof input is 'string'
    handler input, isKey
  else
    input

module.exports = walk