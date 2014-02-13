(function(exports) {
  'use strict';

  function DateTimeFormat() {
    this.mInitialized = true;
  }
  DateTimeFormat.prototype = {
    localeFormat: function mockLocaleFormat(time, strFormat) {
      return '' + time;
    }
  };

  var MockL10n = {
    get: function get(key, params) {
      if (params) {
        return key + JSON.stringify(params);
      }
      return key;
    },
    translate: function() {},
    localize: function() {},
    DateTimeFormat: DateTimeFormat
  };

  exports.MockL10n = MockL10n;

}(this));
