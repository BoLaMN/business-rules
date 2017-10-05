debug = require('debug') 'rules:runner'

filter = require './filter'
update = require './update'
ops    = require './ops'

Interpolate = require './interpolate'

class PolicyRunCondition
  constructor: (@data, { @description, @before, @if, @then, @else }) ->
    @interpolate = new Interpolate @data

    @logs = []

    if @before
      @log ' before '

      @run @before

    if @if
      @process @if
    else
      @run @then

    if @after
      @log ' after'

      @run @after

  log: (msg) ->
    return unless debug.enabled

    @logs.push msg

  process: (tests) =>
    return false unless tests

    where = @walk tests
    bool = @match where
    type = if bool then 'then' else 'else'
    step = @[type]

    return unless step

    @run step, bool

  run: (step, match) ->
    if step.if
      @log new PolicyRunCondition @data, step
    else
      @outcomes step, match

  match: (where = {}) ->
    result = filter @data, where
    bool = not not result

    @log '  if ' + JSON.stringify(where) + ' (' + bool + ')'

    result

  walk: (obj) ->
    @interpolate.walk obj, (val, isKey) =>
      return val unless isKey
      return val unless ops.indexOf(val) is -1

      return val if val.startsWith 'context.' or
                    val.startsWith 'scope.'

      if val[0] is '@'
        return 'context.' + val.substring 1
      else if @data[val]
        return 'scope.' + val

      val

  outcomes: (outcomes = {}, match) ->
    data = @walk outcomes

    if typeof data isnt 'string'
      @log '  then ' + JSON.stringify(data)
    else
      @log '  then ' + data

    @log '  transaction ' + JSON.stringify update @data, match, data

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

run = (conditions, scope = {}, context = {}) ->
  if not Array.isArray(conditions) or not conditions.length
    return context

  new PolicyRun conditions, { context, scope }

module.exports = run
module.exports.PolicyRun = PolicyRun
