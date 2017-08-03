var clone, moment, toFunction, walk;

clone = require('clone');

moment = require('moment-timezone');

toFunction = require('./to-function');

walk = require('../walk');

module.exports = function(interpolate) {
  var isUndefinedOrNull, preprocessDate;
  isUndefinedOrNull = function(val) {
    return val === void 0 || val === null;
  };
  preprocessDate = function(value) {
    if (moment.isMoment(value)) {
      return value;
    } else {
      return moment(value);
    }
  };
  return interpolate.filter('filter', function(array, str) {
    var predicateFn;
    predicateFn = toFunction(str);
    return Array.prototype.filter.call(array, predicateFn);
  }).filter('repeat', function(ctx, val) {
    var process, template;
    template = interpolate.templates[val];
    process = (function(_this) {
      return function(obj) {
        return walk(template, function(value) {
          var child, newCtx;
          newCtx = clone(_this.scope);
          newCtx.scope[val] = obj;
          child = new interpolate(newCtx);
          return child.value(value);
        });
      };
    })(this);
    if (Array.isArray(ctx)) {
      return ctx.map(process);
    } else {
      return process(val);
    }
  }).filter('camel', function(val) {
    if (val == null) {
      val = '';
    }
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  }).filter('proper', function(val) {
    if (val == null) {
      val = '';
    }
    return val.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }).filter('caps', function(val) {
    if (val == null) {
      val = '';
    }
    return val.toUpperCase();
  }).filter('lower', function(val) {
    if (val == null) {
      val = '';
    }
    return val.toLowerCase();
  }).filter('amRelative', function(val) {
    var end, start, str;
    start = val.start, end = val.end;
    if (start && end) {
      str = {
        between: [start.toDate(), end.toDate()]
      };
    } else if (start) {
      str = {
        gte: start.toDate()
      };
    } else if (end) {
      str = {
        lte: end.toDate()
      };
    }
    return str;
  }).filter('amParse', function(value, format) {
    return moment(value, format);
  }).filter('amFromUnix', function(value) {
    return moment.unix(value);
  }).filter('amISOString', function(value) {
    var aMoment;
    aMoment = preprocessDate(value);
    return aMoment.toISOString();
  }).filter('amDate', function(value) {
    var aMoment;
    aMoment = preprocessDate(value);
    return aMoment.toDate();
  }).filter('amUtc', function(value) {
    return moment.utc(value);
  }).filter('amWeekday', function(value) {
    var aMoment;
    aMoment = preprocessDate(value);
    return aMoment.weekday();
  }).filter('amISOWeekday', function(value) {
    var aMoment;
    aMoment = preprocessDate(value);
    return aMoment.isoWeekday();
  }).filter('amUtcOffset', function(value, offset) {
    return preprocessDate(value).utcOffset(offset);
  }).filter('amLocal', function(value) {
    if (moment.isMoment(value)) {
      return value.local();
    } else {
      return null;
    }
  }).filter('amTimezone', function(value, timezone) {
    var aMoment;
    aMoment = preprocessDate(value);
    if (!timezone) {
      return aMoment;
    }
    if (aMoment.tz) {
      return aMoment.tz(timezone);
    } else {
      console.log('angular-moment: named timezone specified but moment.tz() is undefined. Did you forget to include moment-timezone.js ?');
      return aMoment;
    }
  }).filter('amCalendar', function(value, referenceTime, formats) {
    var date;
    if (isUndefinedOrNull(value)) {
      return '';
    }
    date = preprocessDate(value);
    if (date.isValid()) {
      return date.calendar(referenceTime, formats);
    } else {
      return '';
    }
  }).filter('amDifference', function(value, otherValue, unit, usePrecision) {
    var date, date2;
    if (isUndefinedOrNull(value)) {
      return '';
    }
    date = preprocessDate(value);
    date2 = !isUndefinedOrNull(otherValue) ? preprocessDate(otherValue) : moment();
    if (!date.isValid() || !date2.isValid()) {
      return '';
    }
    return date.diff(date2, unit, usePrecision);
  }).filter('amDateFormat', function(value, format) {
    var date;
    if (isUndefinedOrNull(value)) {
      return '';
    }
    date = preprocessDate(value);
    if (!date.isValid()) {
      return '';
    }
    return date.format(format);
  }).filter('amDurationFormat', function(value, format, suffix) {
    if (isUndefinedOrNull(value)) {
      return '';
    }
    return moment.duration(value, format).humanize(suffix);
  }).filter('amTimeAgo', function(value, suffix, from) {
    var date, dateFrom;
    if (isUndefinedOrNull(value)) {
      return '';
    }
    value = preprocessDate(value);
    date = moment(value);
    if (!date.isValid()) {
      return '';
    }
    dateFrom = moment(from);
    if (!isUndefinedOrNull(from) && dateFrom.isValid()) {
      return date.from(dateFrom, suffix);
    }
    return date.fromNow(suffix);
  }).filter('amAddDuration', function(value, duration) {
    if (isUndefinedOrNull(value)) {
      return '';
    }
    duration = moment.duration(duration);
    value = preprocessDate(value);
    return value.add(duration);
  }).filter('amSubtractDuration', function(value, duration) {
    if (isUndefinedOrNull(value)) {
      return '';
    }
    duration = moment.duration(duration);
    value = preprocessDate(value);
    return value.subtract(duration);
  }).filter('amSet', function(value, amount, type) {
    if (isUndefinedOrNull(value)) {
      return '';
    }
    return moment(value).set(type, parseInt(amount, 10));
  }).filter('amSubtract', function(value, amount, type) {
    if (isUndefinedOrNull(value)) {
      return '';
    }
    return moment(value).subtract(parseInt(amount, 10), type);
  }).filter('amAdd', function(value, amount, type) {
    if (isUndefinedOrNull(value)) {
      return '';
    }
    return moment(value).add(parseInt(amount, 10), type);
  }).filter('amStartOf', function(value, type) {
    if (isUndefinedOrNull(value)) {
      return '';
    }
    return moment(value).startOf(type);
  }).filter('amEndOf', function(value, type) {
    if (isUndefinedOrNull(value)) {
      return '';
    }
    return moment(value).endOf(type);
  });
};
