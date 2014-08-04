'use strict';

(function(exports) {
  var values = {};

  var MockL10n = {
    language: {
      code: 'en-US'
    },

    get: function get(key, params) {
      return values[key];
    },

    set: function set(key, value) {
      values[key] = value;
    },

    localize: function localize(element, key, params) {
      if (params) {
        key += JSON.stringify(params);
      }
      element.textContent = key;
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

  exports.MockL10n = MockL10n;

}(window));
