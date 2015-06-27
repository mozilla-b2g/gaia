(function(exports) {
  'use strict';

  var langs = {
    'en-US': 'English (US)'
  };

  exports.MockLanguageList = {
    _languages: {
      then: function(callback) {
        callback(langs);
      }
    },
    get: function() {
      Promise.resolve([langs, 'en-US']);
    },
    wrapBidi: function(lang, name) {
      return name;
    }
  };

}(this));
