debug = require('debug') 'rules:interpolate'

expression = require './expression'
filters = require './filters'

{ unique, walk } = require '../utils'

class Interpolate
  constructor: ({ @scope, @context, filters }) ->
    @_filters = filters

    @re =
      match: new RegExp '\{{2,3}([^\{]*?\|.*?)\}{2,3}', 'g'
      filter: new RegExp """{([^"|]*)}|"([^"|:]*)"|'([^'|]*)'|([^\t(,|:)]+)""", 'g'
      split: new RegExp ' *\\| *'

  @filters: {}
  @templates: {}

  matches: (input) ->
    test = new RegExp @re.match.source

    not not test.exec input

  _matches: (input) ->
    test = new RegExp @re.match.source
    test.exec(input) or []

  @template: (name, template) ->
    @templates[name] = template
    @

  @filter: (name, fn) ->
    @filters[name] = fn
    @

  parse: (types, fn) ->
    types.split(@re.split).forEach (call) =>
      parts = call.match @re.filter

      name = parts.shift().trim()
      args = parts.map @expr

      fn name, args.slice()

  filter: (val, types = []) ->
    if not types.length
      return val

    fns = @_filters or @constructor.filters

    @parse types.join('|'), (name, args) =>
      fn = fns[name]

      if not fn
        return

      args.unshift val

      val = fn.apply @, args

    val

  expr: (expr) ->
    fn = new expression expr

    try
      val = fn.exec @scope, @context
    catch e
      console.error expr, e.message
      val = expr

    val

  exec: (input) ->
    parts = @split input
    expr = parts.shift()
    val = @expr expr

    @filter val, parts

  has: (input) ->
    input.search(@re.match) > -1

  replace: (input) ->
    input.replace @re.match, (_, match) =>
      @exec(match)

  value: (input) ->
    matches = @_matches input

    if not matches.length
      return input

    if matches[0].trim().length isnt input.trim().length
      return @replace input

    @exec matches[1]

  values: (input) ->
    @map input, (match) =>
      @value match

  props: (str) ->
    arr = []

    @each str, (match, expr, filters) ->
      fn = new expression expr
      arr = arr.concat fn.props

    unique arr

  filters: (str) ->
    arr = []

    @each str, (match, expr, filters) =>
      filtersArray = @split filters

      for filtr in filtersArray when filtr isnt ''
        arr.push filtr.trim().split(':')[0]

    unique arr

  each: (str, callback) ->
    index = 0

    while m = @re.match.exec str
      parts = @split m[1]

      expr = parts.shift()
      filters = parts.join '|'

      callback m[0], expr, filters, index

      index++

  walk: (obj, fn) ->
    if typeof fn isnt 'function'
      fn = (val) -> val

    modify = (value, isKey) =>
      val = fn value, isKey

      if @matches val
        @value val
      else val

    walk obj, modify

  split: (val) ->
    val
      .replace /\|\|/g, '\\u007C\\u007C'
      .split '|'

  map: (str, callback) ->
    ret = []
    @each str, =>
      ret.push callback.apply @, arguments
    ret

filters Interpolate

module.exports = Interpolate
