'use strict';

var MockL10n = {
  get: function get(key, params) {
    if (params) {
      return key + JSON.stringify(params);
    }
    return key;
  },
  DateTimeFormat: function() {},
  ready: function(callback) {
    callback();
  }
};

MockL10n.DateTimeFormat.prototype = {
  localeFormat: function mockLocaleFormat(time, strFormat) {
    return '' + time;
  }
};
