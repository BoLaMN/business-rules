{ props } = require './utils'

toFunction = (obj) ->
  switch {}.toString.call obj
    when '[object Object]'
      objectToFunction obj
    when '[object Function]'
      obj
    when '[object String]'
      stringToFunction obj
    when '[object RegExp]'
      regexpToFunction obj
    else
      defaultToFunction obj

defaultToFunction = (val) ->
  (obj) -> val is obj

regexpToFunction = (re) ->
  (obj) -> re.test obj

stringToFunction = (str) ->
  if /^ *\W+/.test str
    return new Function '_', 'return _ ' + str

  new Function '_', 'return ' + get str

objectToFunction = (obj) ->
  match = {}

  for key, value of obj
    match[key] = if typeof value is 'string' then defaultToFunction(value) else toFunction value

  (val) ->
    if typeof val isnt 'object'
      return false

    for key, value of match
      if not val[key]
        return false

      if not value val[key]
        return false

    true

get = (str) ->
  ps = props str

  if not ps.length
    return '_.' + str

  for prop in ps
    val = '_.' + prop
    val = "('function' == typeof #{ val } ? #{ val }() : #{ val })"

    str = stripNested prop, str, val

  str

stripNested = (prop, str, val) ->
  str.replace new RegExp('(\\.)?' + prop, 'g'), ($0, $1) ->
    if $1 then $0 else val

module.exports = toFunction
