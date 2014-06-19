(function(exports) {
  'use strict';

  function DateTimeFormat() {
    this.mInitialized = true;
  }
  DateTimeFormat.prototype = {
    localeFormat: function mockLocaleFormat(time, strFormat) {
      return '' + (+time) + strFormat;
    }
  };

  var MockL10n = {
    get: function get(key, params) {
      if (params) {
        return key + JSON.stringify(params);
      }
      return key;
    },
    ready: function ready(handler) {
      setTimeout(handler);
    },
    once: function ready(handler) {
      setTimeout(handler);
    },
    translate: function translate(element) {},
    translateFragment: function translateFragment(element) {},
    localize: function localize(element, id, args) {
      element.textContent = MockL10n.get(id, args);
    },
    DateTimeFormat: DateTimeFormat
  };

  exports.MockL10n = MockL10n;

}(this));
