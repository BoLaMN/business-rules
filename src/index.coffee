debug = require('debug') 'rules:runner'

filter = require './filter'
update = require './update'
ops    = require './ops'

Interpolate = require './interpolate'

class PolicyRunCondition
  constructor: (@data, { @description, @before, @if, @then, @else }) ->
    @interpolate = new Interpolate @data

    @logs = []

    @run 'before'

    if not @if
      @run 'then'
      return

    @log ' if'

    fn = (item) =>
      @match item

    if Array.isArray @if.or
      @process @if.or.some fn

    else if Array.isArray @if.and
      @process @if.and.every fn

    else if Array.isArray @if
      @process @if.every fn
    else
      @process fn(@if)

  log: (msg) ->
    return unless debug.enabled

    @logs.push msg

  process: (bool) =>
    if bool
      @run 'then' 
    else
      @run 'else'

    @run 'after'

  run: (type) ->
    step = @[type]

    if not step
      return

    @log ' ' + type

    if step.if
      @log new PolicyRunCondition @data, step 
    else
      @outcomes step

  match: (tests = {}) ->
    where = @walk tests
    result = filter @data, where
    
    @log JSON.stringify where

    if typeof result isnt 'string'
      @log '   > ' + JSON.stringify(result), where
    else
      @log '   > ' + result, where

    result

  walk: (obj) ->
    @interpolate.walk obj, (val, isKey) ->
      return val unless isKey
      return val unless ops.indexOf(val) is -1

      processed = val.startsWith 'context.' or 
                  val.startsWith 'scope.'

      if val[0] is '@' 
        'context.' + val.substring 1
      else if processed
        val
      else
        'scope.' + val

  outcomes: (outcomes = {}) ->
    data = @walk outcomes
    result = update data, @data 

    if typeof result isnt 'string'
      @log '   > ' + JSON.stringify(result), data
    else
      @log '   > ' + result, data

    result

class PolicyRun
  constructor: (conditions, data) ->

    if debug.enabled
      m = data.context.id + ':\n'
      m += 'data\n'
      m += ' context\n'
      m += @objToString data.context 
      m += ' scope\n'
      m += @objToString data.scope
      m += 'conditions\n'

    runs = conditions.map (rule) ->
      new PolicyRunCondition data, rule

    if debug.enabled
      m += @flush runs, data

      m += 'result\n'
      m += ' context\n'
      m += @objToString data.context 
      m += ' scope\n'
      m += @objToString data.scope

      debug m

    return data.context

  objToString: (obj, prefix = '') ->
    str = ''

    for own p, v of obj
      str += ' - ' + prefix + p + ': ' + (v?.toString?() or v) + '\n'

    str

  flush: (items, { context, scope }) ->
    m = ''

    handle = ({ logs }) ->
      logs
        .map (log) ->
          if log instanceof PolicyRunCondition
            handle log
          else log
        .join '\n'

    items.forEach (item, idx) ->
      m += ' #' + idx

      if item.description
        m += ' - ' + item.description

      m += '\n'
      m += handle item
      m += '\n'

    m

module.exports = (conditions, scope = {}, context = {}) ->  
  if not Array.isArray(conditions) or not conditions.length
    return context

  new PolicyRun conditions, { context, scope }
