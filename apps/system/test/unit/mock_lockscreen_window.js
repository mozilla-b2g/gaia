'use strict';

(function(exports) {
  var MockLockScreenWindow = function LockScreenWindow() {
    this.openAnimation = 'immediate';
    this.closeAnimatin = 'fade-out';
    this.instanceID = 'fakeapp-id';
    this.open =
    this.close =
    this.kill =
    this.setVisible =
    function() {};

    this.isFullScreen =
    function() { return true;};
  };

  exports.MockLockScreenWindow = MockLockScreenWindow;
})(window);
