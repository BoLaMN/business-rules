parent = (obj, key, init) ->
  if ~key.indexOf('.')
    pieces = key.split('.')
    ret = obj

    i = 0

    while i < pieces.length - 1
      if type(ret) is 'array'
        ret = ret[pieces[i]]
      else if 'object' is type(ret)
        if init and not ret.hasOwnProperty(pieces[i])
          ret[pieces[i]] = {}
        if ret
          ret = ret[pieces[i]]

      i++
    ret
  else
    obj

get = (obj, path) ->
  if ~path.indexOf '.'
    par = parent(obj, path)
    key = path.split('.').pop()

    if type(par) in [ 'object', 'array' ]
      return par[key]
  else
    return obj[path]

  return

type = (val) ->

  toString = Object::toString

  isBuffer = (obj) ->
    not not (obj isnt null and (obj._isBuffer or obj.constructor and typeof obj.constructor.isBuffer is 'function' and obj.constructor.isBuffer(obj)))

  switch toString.call(val)
    when '[object Date]'
      return 'date'
    when '[object RegExp]'
      return 'regexp'
    when '[object Arguments]'
      return 'arguments'
    when '[object Array]'
      return 'array'
    when '[object Error]'
      return 'error'

  if val is null
    return 'null'

  if val is undefined
    return 'undefined'

  if val isnt val
    return 'nan'

  if val and val.nodeType is 1
    return 'element'

  if isBuffer(val)
    return 'buffer'

  val = if val.valueOf
    val.valueOf()
  else Object::valueOf.apply(val)

  typeof val

eql = (matcher, val) ->
  if matcher?._bsontype and val?._bsontype
    return matcher.equals val

  matcher = matcher?.toString?()
  val = val?.toString?()

  switch type matcher
    when 'null', 'undefined'
      return null is val or val is undefined
    when 'regexp'
      return matcher.test val
    when 'array'
      if 'array' is type(val) and matcher.length is val.length
        for match, i in matcher
          if not eql val[i], match
            return false
        return true
      else
        return false
    when 'object'
      keys = {}

      for own i of matcher
        if not val.hasOwnProperty(i) or not eql(matcher[i], val[i])
          return false

        keys[i] = true

      for own i of val
        if not keys.hasOwnProperty(i)
          return false

      return true
    else
      return matcher is val

globals = /\b(this|Array|Date|Object|Math|JSON)\b/g

prop = (str) ->
  str
    .replace(/\.\w+|\w+ *\(|"[^"]*"|'[^']*'|\/([^/]+)\//g, '')
    .replace(globals, '')
    .match(/[$a-zA-Z_]\w*/g) or []

map = (str, props, fn) ->
  re = /\.\w+|\w+ *\(|"[^"]*"|'[^']*'|\/([^/]+)\/|[a-zA-Z_]\w*/g

  str.replace re, (_) ->
    if '(' == _[_.length - 1]
      return fn(_)

    if ! ~props.indexOf(_)
      return _

    fn _

unique = (arr) ->
  ret = []
  i = 0

  while i < arr.length
    if ~ret.indexOf(arr[i])
      i++
      continue

    ret.push arr[i]
    i++

  ret

prefixed = (str) ->
  (_) -> str + _

props = (str, fn) ->
  p = unique(prop(str))

  if fn and 'string' == typeof fn
    fn = prefixed(fn)

  if fn
    return map(str, p, fn)

  p

walk = (input, handler) ->

  plain = (obj) ->
    typeof obj is 'object' and
    obj isnt null and
    obj.constructor is Object

  iterate = (item, isKey = false) ->
    if Array.isArray item
      item.map iterate
    else if plain item
      for own key, val of item
        okey = key
        key = iterate key, true
        item[key] = iterate val
        delete item[okey] unless okey is key
      return item
    else if typeof item is 'string'
      handler item, isKey
    else item

  iterate input

module.exports = { props, unique, walk, parent, get, type, eql }
