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
    get: function(callback) {
      callback(langs, 'en-US');
    },
    wrapBidi: function(lang, name) {
      return name;
    }
  };

}(this));
