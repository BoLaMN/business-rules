debug = require('debug') 'filter:match'
moment = require 'moment-timezone'

{ type, eql } = require './utils'

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

filter = (obj = {}, query) ->
  ret = {}

  for own key, val of query
    keys = key.split('.')
    target = obj

    matches = []

    i = 0

    `walk_keys: //`
    while i < keys.length
      target = target[keys[i]]

      switch type(target)
        when 'array'
          prefix = keys.slice(0, i + 1).join('.')
          search = keys.slice(i + 1).join('.')

          debug 'searching array "%s"', prefix

          if val.$size and not search.length
            return compare(val, target)

          subset = ret[prefix] or target

          ii = 0

          while ii < subset.length
            if search.length
              q = {}
              q[search] = val

              if 'object' is type(subset[ii])
                debug 'attempting subdoc search with query %j', q

              if filter(subset[ii], q)
                  if not ret[prefix] or not ~ret[prefix].indexOf(subset[ii])
                    matches.push subset[ii]
            else
              debug 'performing simple array item search'

              if compare(val, subset[ii])
                if not ret[prefix] or not ~ret[prefix].indexOf(subset[ii])
                  matches.push subset[ii]

            ii++

          if matches.length
            ret[prefix] = ret[prefix] or []
            ret[prefix].push.apply ret[prefix], matches

          `break walk_keys`
        when 'undefined'
          return false
        when 'object'
          if null isnt keys[i + 1]
            i++
            continue
          else if not compare(val, target)
            return false
          break
        else
          if not compare(val, target)
            return false

      i++

  ret

ops =

  $nor: (matcher, val) ->
    not matcher.some (subquery) ->
     filter subquery, val

  $and: (matcher, val) ->
    matcher.every (subquery) ->
      filter subquery, val

  $all: (matcher, val) ->
    @$and matcher, val

  $or: (matcher, val) ->
    matcher.some (subquery) ->
     filter subquery, val

  $mod: (matcher, val) ->
    matcher.some (arr) ->
      val % arr[0] == arr[1]

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

      typeof value is 'string' and isoformat.test(value) and not isNaN(Date.parse(value))

    isTime = (value) ->
      timeformat = new RegExp /^(\d{2}:\d{2}(:\d{2})?)$/g # Match HH:mm:ss

      typeof value is 'string' and timeformat.test(value)

    if isTime(start) and isTime(stop)
      format = 'HH:mm:ss'

      if typeof val is 'string'
        parsed = moment(val).format format
      else
        parsed = val.format format

      a = moment parsed, format
      e = moment stop, format
      s = moment start, format

      debug 'found times', parsed, start, stop, a.isBetween s, e

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
      a = if typeof val is 'number' then val else parseFloat(val)
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

  $where: (matcher, val) ->
    fn = if typeof matcher == 'string'
      new Function('obj', 'return ' + matcher)
    else
      matcher

    fn.call val, val

  $size: (matcher, val) ->
    Array.isArray(val) and
    matcher is val.length

compare = (matcher, val) ->
  if 'object' isnt type(matcher)
    return eql(matcher, val)

  keys = Object.keys(matcher)

  if '$' isnt keys[0][0]
    return eql matcher, val

  for key in keys
    if '$elemMatch' is key
      return false isnt filter(val, matcher.$elemMatch)
    else
      if not ops[key](matcher[key], val)
        return false

  true

module.exports = filter
module.exports.ops = Object.keys ops
