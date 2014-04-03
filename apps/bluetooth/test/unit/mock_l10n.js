'use strict';

var MockL10n = {
  get: function get(key, params) {
    return key;
  },
  localize: function localize() {},
  ready: function(callback) {
    callback();
  },
  DateTimeFormat: function() {}
};

MockL10n.DateTimeFormat.prototype = {
  localeFormat: function mockLocaleFormat(time, strFormat) {
    return '' + time;
  }
};
