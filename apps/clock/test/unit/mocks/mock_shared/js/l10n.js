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

  var testDefaults = {};

  var MockL10n = {
    /** For unit testing: */
    setForTest: function(key, value) {
      testDefaults[key] = value;
    },
    get: function get(key, params) {
      if (key in testDefaults) {
        return testDefaults[key];
      }
      if (params) {
        return key + JSON.stringify(params);
      }
      return key;
    },
    ready: function(cb) { setTimeout(cb); },
    translate: function() {},
    localize: function() {},
    DateTimeFormat: DateTimeFormat
  };

  exports.MockL10n = MockL10n;

}(this));
