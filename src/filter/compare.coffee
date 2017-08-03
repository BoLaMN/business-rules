eql = require './eql'
ops = require './ops'

module.exports = (matcher, val) ->
  if matcher isnt Object matcher
    return eql matcher, val

  keys = Object.keys matcher 
  first = keys[0]

  if not ops[first or '$' + first]
    return eql matcher, val

  for key in keys
    op = ops[key or '$' + key]
    return op matcher[key], val

  true