'use strict';

var MockL10n = {
  get: function get(key, params) {
    return key;
  },
  localize: function localize(element, l10nId) {},
  ready: function(callback) {
    callback();
  },
  DateTimeFormat: function() {},
  translate: function() {},
  language: {
    code: 'en-US'
  }
};

MockL10n.DateTimeFormat.prototype = {
  localeFormat: function mockLocaleFormat(time, strFormat) {
    return '' + time;
  }
};
