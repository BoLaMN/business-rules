debug = require('debug') 'rules:filter:ops'
moment = require 'moment-timezone'

type = require './type'
eql = require './eql'
filter = require './'

types =
  1: 'number'
  2: 'string'
  3: 'object'
  4: 'array'
  5: 'buffer'
  6: 'undefined'
  8: 'boolean'
  9: 'date'
  10: 'null'
  11: 'regexp'
  13: 'function'
  16: 'number'
  18: 'number'

ops = 

  $ne: (matcher, val) ->
    not eql matcher, val

  $type: (matcher, val) ->
    type(matcher) is 'number' and 
    type(val) is types[matcher] 

  $between: ([ start, stop ], val) ->
    if ~[ null, undefined ].indexOf val 
      return false

    isDate = (value) ->
      isoformat = new RegExp [
        '^\\d{4}-\\d{2}-\\d{2}'        # Match YYYY-MM-DD
        '((T\\d{2}:\\d{2}(:\\d{2})?)'  # Match THH:mm:ss
        '(\\.\\d{1,6})?'               # Match .sssss
        '(Z|(\\+|-)\\d{2}:\\d{2})?)?$' # Time zone (Z or +hh:mm)
      ].join ''

      typeof value == 'string' and isoformat.test(value) and !isNaN(Date.parse(value))

    isTime = (value) ->
      timeformat = new RegExp /^(\d{2}:\d{2}(:\d{2})?)$/g # Match HH:mm:ss

      typeof value == 'string' and timeformat.test(value)

    if isTime(start) and isTime(stop)
      format = 'HH:mm:ss'

      if typeof val is 'string'
        parsed = moment(val).format format
      else
        parsed = val.format format

      a = moment parsed, format
      e = moment stop, format
      s = moment start, format

      debug 'found times', a, start, stop, a.isBetween s, e

      a.isBetween s, e
    else if isDate(start) and isDate(stop)
      if typeof val is 'string'
        a = moment val 
      else
        a = val 

      e = moment stop
      s = moment start

      debug 'found dates', a, start, stop, a.isBetween s, e

      a.isBetween s, e
    else
      a = if typeof val == 'number' then val else parseFloat(val)
      a >= start and val <= stop

  $gt: (matcher, val) ->
    type(matcher) is 'number' and 
    val > matcher

  $gte: (matcher, val) ->
    type(matcher) is 'number' and 
    val >= matcher

  $lt: (matcher, val) ->
    type(matcher) is 'number' and 
    val < matcher

  $lte: (matcher, val) ->
    type(matcher) is 'number' and 
    val <= matcher

  $elemMatch: (matcher, val) ->
    not filter val, matcher

  $regex: (matcher, val) ->
    if 'regexp' isnt type matcher
      matcher = new RegExp matcher
    matcher.test val

  $exists: (matcher, val) ->
    if matcher
      val isnt undefined
    else
      val is undefined

  $in: (matcher, val) ->
    if type(matcher) is val
      return false

    matcher.some (match) ->
      eql match, val

    false

  $nin: (matcher, val) ->
    not @$in matcher, val

  $size: (matcher, val) ->
    Array.isArray(val) and 
    matcher is val.length

module.exports = ops