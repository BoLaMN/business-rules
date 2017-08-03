ops = require './ops'

modify = (obj, field, value) ->
  parts = if typeof field is 'string' then field.split('.') else field

  if parts.length is 1
    return (m) =>
      modder = ops[m].bind this
      modder obj, field, value

  (m) =>
    if obj[parts[0]] is undefined
      if m is '$unset'
        return

      obj[parts[0]] = {}

    modder = ops[m].bind this
    modder obj[parts[0]], parts.slice(1), value

module.exports = (data, doc) ->
  mods = Object.keys data

  forceSet = mods.filter (mod) ->
    mod[0] is '$'

  if not forceSet.length
    keys = Object.keys data

    keys.forEach (k) ->
      modify(doc, k, data[k]) '$set'
  else
    mods.forEach (modifier) ->
      if not ops[modifier]
        throw new Error 'Unknown modifier ' + modifier

      if typeof data[modifier] isnt 'object'
        throw new Error 'Modifier ' + modifier + '\'s argument must be an object'

      keys = Object.keys data[modifier]

      keys.forEach (k) ->
        modify(doc, k, data[modifier][k]) modifier

  doc
