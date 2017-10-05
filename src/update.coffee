debug = require('debug') 'filter:update'
filter = require './filter'

{ type, eql, parent, get } = require './utils'

###*
# Helper for determining if an array has the given value.
#
# @param {Array} array
# @param {Object} value to check
# @return {Boolean}
###

has = (array, val) ->
  i = 0
  l = array.length

  while i < l
    if eql(val, array[i])
      return true
    i++

  false

###*
# Array#filter function generator for `$pull`/`$pullAll` operations.
#
# @param {Array} array of values to match
# @param {Array} array to populate with results
# @return {Function} that splices the array
###

pull = (arr, vals, pulled) ->
  indexes = []
  a = 0

  while a < arr.length
    val = arr[a]
    i = 0

    while i < vals.length
      matcher = vals[i]

      if 'object' is type(matcher)
        if 'object' is type(val)
          match = false

          if Object.keys(matcher).length
            for i of matcher
              if matcher.hasOwnProperty(i)
                if eql(matcher[i], val[i])
                  match = true
                else
                  match = false
                  break
          else if not Object.keys(val).length
            match = true

          if match
            indexes.push a
            pulled.push val

            i++
            continue
        else
          debug 'ignoring pull match against object'
      else
        if eql(matcher, val)
          indexes.push a
          pulled.push val

          i++
          continue

      i++
    a++

  ->
    i = 0

    while i < indexes.length
      index = indexes[i]
      arr.splice index - i, 1

      i++

    return

###*
# Helper to determine if a value is numeric.
#
# @param {String|Number} value
# @return {Boolean} true if numeric
# @api private
###

numeric = (val) ->
  'number' is type(val) or
  Number(val) is val or
  not isNaN(val) and
  not isNaN(parseFloat(val))

ops =

  $set: (obj, path, val) ->
    key = path.split('.').pop()
    obj = parent(obj, path, true)

    switch type(obj)
      when 'object'
        if not eql(obj[key], val)
          return ->
            obj[key] = val
            val
      when 'array'
        if numeric(key)
          if not eql(obj[key], val)
            return ->
              obj[key] = val
              val
        else
          throw new Error('can\'t append to array using string field name [' + key + ']')
      else
        throw new Error('$set only supports object not ' + type(obj))

    return

  ###*
  # Performs an `$unset`.
  #
  # @param {Object} object to modify
  # @param {String} path to alter
  # @param {String} value to set
  # @return {Function} transaction (unless noop)
  ###

  $unset: (obj, path) ->
    key = path.split('.').pop()
    obj = parent(obj, path)

    switch type(obj)
      when 'array', 'object'
        if obj.hasOwnProperty(key)
          return ->
            delete obj[key]
            return
        else
          debug 'ignoring unset of inexisting key'

    return

  ###*
  # Performs a `$rename`.
  #
  # @param {Object} object to modify
  # @param {String} path to alter
  # @param {String} value to set
  # @return {Function} transaction (unless noop)
  ###

  $rename: (obj, path, newKey) ->
    if path is newKey
      throw new Error('$rename source must differ from target')

    if 0 is path.indexOf(newKey + '.')
      throw new Error('$rename target may not be a parent of source')

    p = parent(obj, path)
    t = type(p)

    if 'object' is t
      key = path.split('.').pop()

      if p.hasOwnProperty(key)
        return ->
          val = p[key]
          delete p[key]
          newp = parent(obj, newKey, true)

          if 'object' is type(newp)
            newp[newKey.split('.').pop()] = val
          else
            debug 'invalid $rename target path type'
          newKey
      else
        debug 'ignoring rename from inexisting source'
    else if 'undefined' isnt t
      throw new Error('$rename source field invalid')

    return

  ###*
  # Performs an `$inc`.
  #
  # @param {Object} object to modify
  # @param {String} path to alter
  # @param {String} value to set
  # @return {Function} transaction (unless noop)
  ###

  $inc: (obj, path, inc) ->
    if 'number' isnt type(inc)
      throw new Error('Modifier $inc allowed for numbers only')

    obj = parent(obj, path, true)
    key = path.split('.').pop()

    switch type(obj)
      when 'array', 'object'
        if obj.hasOwnProperty(key)
          if 'number' isnt type(obj[key])
            throw new Error('Cannot apply $inc modifier to non-number')
          return ->
            obj[key] += inc
            inc
        else if 'object' is type(obj) or numeric(key)
          return ->
            obj[key] = inc
            inc
        else
          throw new Error('can\'t append to array using string field name [' + key + ']')
      else
        throw new Error('Cannot apply $inc modifier to non-number')

    return

  ###*
  # Performs an `$pop`.
  #
  # @param {Object} object to modify
  # @param {String} path to alter
  # @param {String} value to set
  # @return {Function} transaction (unless noop)
  ###

  $pop: (obj, path, val) ->
    obj = parent(obj, path)
    key = path.split('.').pop()

    switch type(obj)
      when 'array', 'object'
        if obj.hasOwnProperty(key)
          switch type(obj[key])
            when 'array'
              if obj[key].length
                return ->
                  if -1 is val
                    obj[key].shift()
                  else
                    obj[key].pop()
            when 'undefined'
              debug 'ignoring pop to inexisting key'
            else
              throw new Error('Cannot apply $pop modifier to non-array')
        else
          debug 'ignoring pop to inexisting key'
      when 'undefined'
        debug 'ignoring pop to inexisting key'

    return

  ###*
  # Performs a `$push`.
  #
  # @param {Object} object to modify
  # @param {String} path to alter
  # @param {Object} value to push
  # @return {Function} transaction (unless noop)
  ###

  $push: (obj, path, val) ->
    obj = parent(obj, path, true)
    key = path.split('.').pop()

    switch type(obj)
      when 'object'
        if obj.hasOwnProperty(key)
          if 'array' is type(obj[key])
            return ->
              obj[key].push val
              val
          else
            throw new Error('Cannot apply $push/$pushAll modifier to non-array')
        else
          return ->
            obj[key] = [ val ]
            val
      when 'array'
        if obj.hasOwnProperty(key)
          if 'array' is type(obj[key])
            return ->
              obj[key].push val
              val
          else
            throw new Error('Cannot apply $push/$pushAll modifier to non-array')
        else if numeric(key)
          return ->
            obj[key] = [ val ]
            val
        else
          throw new Error('can\'t append to array using string field name [' + key + ']')

    return

  ###*
  # Performs a `$pushAll`.
  #
  # @param {Object} object to modify
  # @param {String} path to alter
  # @param {Array} values to push
  # @return {Function} transaction (unless noop)
  ###

  $pushAll: (obj, path, val) ->
    if 'array' isnt type(val)
      throw new Error('Modifier $pushAll/pullAll allowed for arrays only')

    obj = parent(obj, path, true)
    key = path.split('.').pop()

    switch type(obj)
      when 'object'
        if obj.hasOwnProperty(key)
          if 'array' is type(obj[key])
            return ->
              obj[key].push.apply obj[key], val
              val
          else
            throw new Error('Cannot apply $push/$pushAll modifier to non-array')
        else
          return ->
            obj[key] = val
            val
      when 'array'
        if obj.hasOwnProperty(key)
          if 'array' is type(obj[key])
            return ->
              obj[key].push.apply obj[key], val
              val
          else
            throw new Error('Cannot apply $push/$pushAll modifier to non-array')
        else if numeric(key)
          return ->
            obj[key] = val
            val
        else
          throw new Error('can\'t append to array using string field name [' + key + ']')

    return

  ###*
  # Performs a `$pull`.
  ###

  $pull: (obj, path, val) ->
    obj = parent(obj, path, true)
    key = path.split('.').pop()

    t = type(obj)

    switch t
      when 'object'
        if obj.hasOwnProperty(key)
          if 'array' is type(obj[key])
            pulled = []
            splice = pull(obj[key], [ val ], pulled)

            if pulled.length
              return ->
                splice()
                pulled
          else
            throw new Error('Cannot apply $pull/$pullAll modifier to non-array')
      when 'array'
        if obj.hasOwnProperty(key)
          if 'array' is type(obj[key])
            pulled = []
            splice = pull(obj[key], [ val ], pulled)

            if pulled.length
              return ->
                splice()
                pulled
          else
            throw new Error('Cannot apply $pull/$pullAll modifier to non-array')
        else
          debug 'ignoring pull to non array'
      else
        if 'undefined' isnt t
          throw new Error('LEFT_SUBFIELD only supports Object: hello not: ' + t)

    return

  ###*
  # Performs a `$pullAll`.
  ###

  $pullAll: (obj, path, val) ->
    if 'array' isnt type(val)
      throw new Error('Modifier $pushAll/pullAll allowed for arrays only')

    obj = parent(obj, path, true)
    key = path.split('.').pop()

    t = type(obj)

    switch t
      when 'object'
        if obj.hasOwnProperty(key)
          if 'array' is type(obj[key])
            pulled = []
            splice = pull(obj[key], val, pulled)

            if pulled.length
              return ->
                splice()
                pulled
          else
            throw new Error('Cannot apply $pull/$pullAll modifier to non-array')
      when 'array'
        if obj.hasOwnProperty(key)
          if 'array' is type(obj[key])
            pulled = []
            splice = pull(obj[key], val, pulled)

            if pulled.length
              return ->
                splice()
                pulled
          else
            throw new Error('Cannot apply $pull/$pullAll modifier to non-array')
        else
          debug 'ignoring pull to non array'
      else
        if 'undefined' isnt t
          throw new Error('LEFT_SUBFIELD only supports Object: hello not: ' + t)

    return

  ###*
  # Performs a `$addToSet`.
  #
  # @param {Object} object to modify
  # @param {String} path to alter
  # @param {Object} value to push
  # @param {Boolean} internal, true if recursing
  # @return {Function} transaction (unless noop)
  ###

  $addToSet: (obj, path, val, recursing) ->
    if not recursing and 'array' is type(val.$each)
      fns = []

      i = 0
      l = val.$each.length

      while i < l
        fn = @$addToSet(obj, path, val.$each[i], true)

        if fn
          fns.push fn

        i++

      if fns.length
        return ->
          values = []
          i = 0

          while i < fns.length
            values.push fns[i]()
            i++

          values
      else
        return

    obj = parent(obj, path, true)
    key = path.split('.').pop()

    switch type(obj)
      when 'object'
        if obj.hasOwnProperty(key)
          if 'array' is type(obj[key])
            if not has(obj[key], val)
              return ->
                obj[key].push val
                val
          else
            throw new Error('Cannot apply $addToSet modifier to non-array')
        else
          return ->
            obj[key] = [ val ]
            val
      when 'array'
        if obj.hasOwnProperty(key)
          if 'array' is type(obj[key])
            if not has(obj[key], val)
              return ->
                obj[key].push val
                val
          else
            throw new Error('Cannot apply $addToSet modifier to non-array')
        else if numeric(key)
          return ->
            obj[key] = [ val ]
            val
        else
          throw new Error('can\'t append to array using string field name [' + key + ']')

    return

###*
# Execute a update.
#
# Options:
#  - `strict` only modify if query matches
#
# @param {Object} object to alter
# @param {Object} query to filter modifications by
# @param {Object} update object
# @param {Object} options
###

update = (data = {}, match, update = {}) ->
  log = []

  transactions = []

  for op, mod of update when ops[op]
    #debug 'found modifier "%s"', op

    for key, val of mod
      pos = key.indexOf '.$.'

      if ~pos
        prefix = key.substr 0, pos
        suffix = key.substr pos + 3

        if match[prefix]
          debug 'executing "%s" %s on first match within "%s"', key, op, prefix

          fn = ops[op] match[prefix][0], suffix, val

          if fn
            index = get(data, prefix).indexOf match[prefix][0]

            fn.key = prefix + '.' + index + '.' + suffix
            fn.op = op

            transactions.push fn
        else
          debug 'ignoring "%s" %s - no matches within "%s"', key, op, prefix
      else
        fn = ops[op] data, key, val

        if fn
          fn.key = key
          fn.op = op
          transactions.push fn

  if transactions.length
    for fn in transactions

      log.push
        op: fn.op.replace '$', ''
        key: fn.key
        from: get data, fn.key
        to: fn()

  log

module.exports = update
module.exports.ops = Object.keys ops
