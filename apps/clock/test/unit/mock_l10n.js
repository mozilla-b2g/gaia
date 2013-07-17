(function(exports) {
  'use strict';

  var MockL10n = {
    get: function get(key, params) {
      if (params) {
        return key + JSON.stringify(params);
      }
      return key;
    }
  };

  exports.MockL10n = MockL10n;

}(this));
