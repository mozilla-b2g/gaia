'use strict';

var MockMozL10n = {
  get: function get(key) {
    return key;
  },
  translate: function translate() {

  },
  DateTimeFormat: function() {
    return {
      localeFormat: function(date, format) {
        return date.toISOString() + '|' + format;
      }
    };
  }
};
