module.exports = (val) ->
  
  switch Object::toString.call val
    when '[object Function]'
      return 'function'
    when '[object Date]'
      return 'date'
    when '[object RegExp]'
      return 'regexp'
    when '[object Arguments]'
      return 'arguments'
    when '[object Array]'
      return 'array'
      
  if val is null
    return 'null'

  if val is undefined
    return 'undefined'

  if val is Object val
    return 'object'

  typeof val
