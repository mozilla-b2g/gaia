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
    if (key === 'weekStartsOnMonday') {
      return '0';
    }
    return key;
  },
  ready: function(cb) {
    if (cb) {
      cb();
    }
  },
  translate: function translate() {

  },
  DateTimeFormat: function() {

  },
  localize: function localize(element, id, args) {
    element.textContent = id;
  }
};

MockMozL10n.DateTimeFormat.prototype = {
  localeFormat: function(date, format) {
    var formattedDate = date.toISOString() + '|' + format;
    if (format === 'shortTimeFormat') {
      var options = {hour12: 'true', hour: 'numeric', minute: '2-digit'};
      formattedDate = date.toLocaleTimeString('en-US', options);
    }
    if (format === 'short-date-format') {
      var optionsSDF = {month: 'short', day: 'numeric'};
      formattedDate = date.toLocaleTimeString('en-US', optionsSDF);
    }
    if (format === '%a') {
      var optionsWD = {weekday: 'short'};
      formattedDate = date.toLocaleDateString('en-US', optionsWD);
    }
    return formattedDate;
  }
};
