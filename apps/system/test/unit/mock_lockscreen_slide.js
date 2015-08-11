
'use strict';

(function(exports) {

  var MockLockScreenSlide = function LockScreenSlide(ir) {
    this.ir = ir;
    this._stop = () => {};
    this._start = () => {};
  };

  exports.MockLockScreenSlide = MockLockScreenSlide;
})(window);
