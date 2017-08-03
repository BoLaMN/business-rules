
isDate = (obj) ->
  Object::toString.call(obj) is '[object Date]'

compare = (a, b) ->
  if a == b
    return 0

  if typeof a == typeof b
    if a > b
      return 1

    if a < b
      return -1

  return

compareThings = (a, b, _compareStrings) ->
  compareStrings = _compareStrings or compare

  # undefined
  if a is undefined
    return if b is undefined then 0 else -1
  if b is undefined
    return if a is undefined then 0 else 1

  # null
  if a is null
    return if b is null then 0 else -1
  if b is null
    return if a is null then 0 else 1

  # Numbers
  if typeof a is 'number'
    return if typeof b is 'number' then compare(a, b) else -1
  if typeof b is 'number'
    return if typeof a is 'number' then compare(a, b) else 1

  # Strings
  if typeof a is 'string'
    return if typeof b is 'string' then compareStrings(a, b) else -1
  if typeof b is 'string'
    return if typeof a is 'string' then compareStrings(a, b) else 1

  # Booleans
  if typeof a is 'boolean'
    return if typeof b is 'boolean' then compare(a, b) else -1
  if typeof b is 'boolean'
    return if typeof a is 'boolean' then compare(a, b) else 1

  # Dates
  if isDate(a)
    return if isDate(b) then compare(a.getTime(), b.getTime()) else -1
  if isDate(b)
    return if isDate(a) then compare(a.getTime(), b.getTime()) else 1

  if Array.isArray(a)
    return if Array.isArray(b) then compareArrays(a, b) else -1
  if Array.isArray(b)
    return if Array.isArray(a) then compareArrays(a, b) else 1

  # Objects
  aKeys = Object.keys(a).sort()
  bKeys = Object.keys(b).sort()

  i = 0

  while i < Math.min(aKeys.length, bKeys.length)
    comp = compareThings(a[aKeys[i]], b[bKeys[i]])

    if comp != 0
      return comp

    i += 1

  compare aKeys.length, bKeys.length

compareArray = (a, b) ->
  i = 0

  while i < Math.min(a.length, b.length)
    comp = compareThings(a[i], b[i])

    if comp != 0
      return comp

    i += 1

  compare a.length, b.length

module.exports = compareThings
