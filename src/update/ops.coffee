debug = require('debug') 'rules:update:ops'

compare = require './utils'

module.exports =

  $set: (obj, field, value) ->
    obj[field] = value
    return

  $unset: (obj, field, value) ->
    delete obj[field]
    return

  $push: (obj, field, value) ->
    if not obj.hasOwnProperty field
      obj[field] = []

    if not Array.isArray obj[field]
      throw new Error 'Can\'t $push an element on non-array values'

    if value isnt null and typeof value is 'object'
      if value.$slice and value.$each is undefined
        value.$each = []
    else
      if not value.$each
        return obj[field].push value

    keys = Object.keys value

    if keys.length >= 3 or keys.length is 2 and value.$slice is undefined
      throw new Error 'only use $slice with $each when $push to array'

    if not Array.isArray value.$each
      throw new Error '$each requires an array value'

    value.$each.forEach (v) ->
      obj[field].push v

    if value.$slice is undefined or typeof value.$slice isnt 'number'
      return

    if value.$slice is 0
      obj[field] = []
    else
      n = obj[field].length

      if value.$slice < 0
        start = Math.max 0, n + value.$slice
        end = n
      else if value.$slice > 0
        start = 0
        end = Math.min n, value.$slice

      obj[field] = obj[field].slice start, end

    return

  $addToSet: (obj, field, value) ->
    addToSet = true

    if not obj.hasOwnProperty field
      obj[field] = []

    if not Array.isArray obj[field]
      throw new Error 'Can\'t $addToSet an element on non-array values'

    if value isnt null and typeof value is 'object' and value.$each
      if Object.keys(value).length > 1
        throw new Error 'Can\'t use another field in conjunction with $each'

      if not Array.isArray value.$each
        throw new Error '$each requires an array value'

      value.$each.forEach (v) =>
        @$addToSet obj, field, v
        return
    else
      obj[field].forEach (v) ->
        if compare(v, value) is 0
          addToSet = false

      if addToSet
        obj[field].push value

    return

  $pop: (obj, field, value) ->
    if not Array.isArray obj[field]
      throw new Error '$pop on element from non-array values'

    if typeof value isnt 'number'
      throw new Error value + ' isnt an integer, cant use with $pop'

    if value is 0
      return

    if value > 0
      obj[field] = obj[field].slice 0, obj[field].length - 1
    else
      obj[field] = obj[field].slice 1

    return

  $pull: (obj, field, value) ->
    if not Array.isArray obj[field]
      throw new Error '$pull on element from non-array values'

    arr = obj[field]
    i = arr.length - 1

    while i >= 0
      if @matches arr[i], value
        arr.splice i, 1
      i -= 1

    return

  $inc: (obj, field, value) ->
    if typeof value isnt 'number'
      throw new Error value + ' must be a number'

    if typeof obj[field] isnt 'number'
      if not obj[field]
        obj[field] = value
      else
        throw new Error '$inc modifier on non-number fields'
    else
      obj[field] += value

    return

  $max: (obj, field, value) ->
    if typeof obj[field] is 'undefined'
      obj[field] = value
    else if value > obj[field]
      obj[field] = value

    return

  $min: (obj, field, value) ->
    if typeof obj[field] is 'undefined'
      obj[field] = value
    else if value < obj[field]
      obj[field] = value

    return
