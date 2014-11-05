/* global MockL10n */

require('/shared/test/unit/mocks/mock_l10n.js');

(function(exports) {
  'use strict';

  exports.MockLazyL10n = {

    get: function(callback) {
      setTimeout(function() {
        callback(MockL10n.get);
      });
    }

  };

})(this);
