
(function(exports) {
  'use strict';
  var MockCardUtil = {
    createCardFragment: function(card) {
      var frg = document.createDocumentFragment();
      frg.appendChild(document.createElement('smart-button'));
      frg.appendChild(document.createElement('span'));
      return frg;
    }
  };
  exports.MockCardUtil = MockCardUtil;
})(window);
