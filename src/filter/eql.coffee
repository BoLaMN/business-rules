type = require './type'

eql = (matcher, val) ->
  if not matcher?
    return val is null 
  
  if type(matcher) is 'regex'
    return matcher.test val

  if matcher?._bsontype and val?._bsontype
    if matcher.equals val
      return true

    matcher = matcher.getTimestamp().getTime()
    val = val.getTimestamp().getTime()

  if Array.isArray matcher
    if Array.isArray(val) and matcher.length is val.length
      matcher.every (match, i) -> eql val[i], match
    else
      false
  else if typeof matcher isnt 'object'
    matcher is val
  else
    keys = {}

    for own key, match of matcher
      if not eql match, val[key]
        return false

      keys[i] = true

    for own key of val
      if not keys[key]
        return false

    true

module.exports = eql