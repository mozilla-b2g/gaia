
'use strict';

(function(exports) {

  var MockLockScreenSlide = function LockScreenSlide(ir) {
    this.ir = ir;
    this._stop = function() {}; // called by LockScreen.init()
  };

  exports.MockLockScreenSlide = MockLockScreenSlide;
})(window);
