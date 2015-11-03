/* exported MockMozL10n */
'use strict';

var MockMozL10n = {
  get: function get(key, args) {
    if (key === 'magnitude') {
      return args.value + ' ' + args.unit;
    }
    if (key === 'currency') {
      return args.value + ' ' + args.currency;
    }
    if (key === 'day-hour-format') {
      return args.day + ', ' + args.time;
    }
    if (key === 'hours-ago-short') {
      return args.value + 'h ago';
    }
    if (key === 'minutes-ago-short') {
      if (args.value !== 0) {
        return args.value + 'm ago';
      } else {
        return 'just now';
      }
    }
    if (key === 'firstDayOfTheWeek') {
      return '0';
    }
    return key;
  },
  ready: function(cb) {
    if (cb) {
      cb();
    }
  },
};
