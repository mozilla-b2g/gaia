define(function() {
  'use strict';

  function DateTimeFormat() {
    this.mInitialized = true;
  }
  DateTimeFormat.prototype = {
    localeFormat: function mockLocaleFormat(time, strFormat) {
      return '' + time;
    }
  };

  var testDefaults = {'en-US': {}};
  var currentLanguage = 'en-US';

  // callbacks to be fired onready
  var onreadycbs = [];

  return {
    get: function get(key, params) {
      var res = testDefaults[currentLanguage];

      if (key in res) {
        return res[key];
      }
      if (params) {
        return key + JSON.stringify(params);
      }
      return key;
    },
    ready: function(cb) {
      setTimeout(cb);
      onreadycbs.push(cb);
    },
    translate: function() {},
    localize: function() {},
    DateTimeFormat: DateTimeFormat,

    // for unit tests
    setResources: function(lang, res) {
      testDefaults[lang] = res;
    },
    language: {
      set code(lang) {
        currentLanguage = lang;
        for (var cb of onreadycbs) {
          cb();
        }
      }
    },
  };

});
