'use strict';

var MockL10n = {
  get: function get(key, params) {
    if (params) {
      return key + JSON.stringify(params);
    }
    return key;
  },
  DateTimeFormat: function() {
    var localeFormat = function mockLocaleFormat(time, strFormat) {
      return '' + time;
    };
    // support navigator.mozL10n.DateTimeFormat() without new the object
    return {
        localeFormat: localeFormat
    };
  },
  ready: function(callback) {
    callback();
  }
};
