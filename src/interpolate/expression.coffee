{ props, unique } = require '../utils'
{ parse } = require './cson'

class Expression
  constructor: (str) ->
    @cache = {}

    @str = str
      .replace /\\u007C\\u007C/g, '||'
      .replace /(@)(\w+)/g, 'this.$2'

    @props = unique props(@str)
    @fn = @compile @str, @props

  values: (obj, keys) ->
    keys.map (key) ->
      obj[key]

  compile: (str, props) ->
    if @cache[str]
      return @cache[str]

    args = props.slice()
    args.push 'return ' + parse str

    fn = Function.apply null, args

    @cache[str] = fn

    fn

  exec: (scope = {}, context) ->
    args = @values scope, @props
    @fn.apply context, args

  toString: ->
    @str

module.exports = Expression
