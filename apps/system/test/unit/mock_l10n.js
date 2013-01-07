
var MockL10n = {
  get: function get(key, params) {
    return key;
  },
  DateTimeFormat: function() {}
};

MockL10n.DateTimeFormat.prototype = {
  localeFormat: function mockLocaleFormat(time, strFormat) {
    return '' + time;
  }
};
