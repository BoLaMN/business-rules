compare = require './compare'

filter = (obj = {}, query) ->

  check = (val) -> 
    filter obj, val

  for own key, val of query

    if key in [ '$and', 'and' ]
      return val.every check
    else if key in [ '$or', 'or' ]
      return val.some check
    else if key in [ '$nor', 'nor' ]
      return not val.some check
    
    target = obj
    parts = key.split '.' 

    for part, i in parts
      target = target[part]

      if target is undefined
        return false
      else if Array.isArray target
        prefix = parts.slice(0, i + 1).join '.'
        search = parts.slice(i + 1).join '.'

        if val.$size and not search.length
          return compare val, target
 
        matches = target.filter (subkey) ->
          if not search.length and compare val, subkey
            k = subkey
          else if subkey is Object subkey
            k = subkey if filter subkey, "#{search}": val
          not target or not ~target.indexOf k
        return matches.length > 0
      else if typeof target is 'object' 
        if parts[i + 1]
          continue
        else 
          return compare val, target
      else 
        return compare val, target

  false

module.exports = filter