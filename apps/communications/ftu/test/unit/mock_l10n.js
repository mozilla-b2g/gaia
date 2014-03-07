'use strict';

var MockL10n = {
  get: function(key, params) {
    if (params) {
      return key + JSON.stringify(params);
    }
    return key;
  },
  localize: function(element, label, args) {
    element.textContent = label;
  },
  DateTimeFormat: function () {
  }
};

MockL10n.DateTimeFormat.prototype = {
  localeFormat: function mockLocaleFormat(time, strFormat) {
    return '' + time;
  }
};
