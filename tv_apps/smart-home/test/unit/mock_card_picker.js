/* globals evt */

(function(exports) {
  'use strict';
  function MockCardPicker() {
    this._shown = false;
  }

  MockCardPicker.prototype = evt({
    get isShown() {
      return this._shown;
    }
  });
  exports.MockCardPicker = MockCardPicker;
})(window);
