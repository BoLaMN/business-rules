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

module.exports =

  parse: (str, scope, context) ->
    regex = RegExp ' *\\| *'
    re = RegExp """{([^"|]*)}|"([^"|:]*)"|'([^'|]*)'|([^\t(,|:)]+)""", 'g'

    expression = require './expression'

    str.split(regex).map (call) ->
      parts = call.match re
      
      name = parts.shift()

      compiled = parts
        .map (expr) ->
          fn = new expression expr

          try
            val = fn.exec scope, context
          catch e
            console.error expr, e.message
            val = expr

          val

      name: name
      args: compiled

  props: (str, fn) ->
    p = unique(prop(str))

    if fn and 'string' == typeof fn
      fn = prefixed(fn)

    if fn
      return map(str, p, fn)

    p

  unique: unique