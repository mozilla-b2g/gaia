
(function(exports) {
  'use strict';
  var MockCardUtil = {
    createCardButton: function(card) {
      return document.createElement('smart-button');
    }
  };
  exports.MockCardUtil = MockCardUtil;
})(window);
