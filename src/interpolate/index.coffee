debug = require('debug') 'rules:interpolate'

expression = require './expression' 
filters = require './filters'

walk = require '../walk'

{ unique, parse } = require './utils' 

class Interpolate
  constructor: ({ @scope, @context, filters }) ->
    @_filters = filters

    @match = new RegExp '\{{2,3}([^\{]*?\|.*?)\}{2,3}', 'g'

  @filters: {}
  @templates: {}

  matches: (input) ->
    test = new RegExp @match.source

    not not test.exec input

  _matches: (input) ->
    test = new RegExp @match.source
    matches = test.exec(input)

    if !matches
      return []

    matches

  @template: (name, template) ->
    @templates[name] = template
    @

  @filter: (name, fn) ->
    @filters[name] = fn
    @

  filter: (val, types = []) ->
    if not types.length 
      return val 
      
    fns = @_filters or @constructor.filters
    filters = parse types.join('|'), @scope, @context

    filters.forEach (f) =>
      name = f.name.trim()
      fn = fns[name]

      args = f.args.slice()
      args.unshift val

      if not fn
        return

      val = fn.apply @, args

    val

  exec: (input) ->
    parts = @split input

    expr = parts.shift()
    fn = new expression expr

    try
      val = fn.exec @scope, @context 
    catch e
      debug e.message

    @filter val, parts 

  has: (input) ->
    input.search(@match) > -1

  replace: (input) ->
    input.replace @match, (_, match) =>
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

    while m = @match.exec str
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