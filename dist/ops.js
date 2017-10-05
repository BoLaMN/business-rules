var ops;

ops = [];

ops.push.apply(ops, require('./filter').ops);

ops.push.apply(ops, require('./update').ops);

module.exports = ops;
