(function(exports) {
  'use strict';

  exports.MockLanguageList = {
    _languages: {
      'en-US': 'English (US)'
    },
    get: function(callback) {
      callback(this._languages, 'en-US');
    },
    wrapBidi: function(lang, name) {
      return name;
    }
  };

}(this));
