var filter, update;

filter = Object.keys(require('./filter/ops'));

update = Object.keys(require('./update/ops'));

module.exports = filter.concat(update);
