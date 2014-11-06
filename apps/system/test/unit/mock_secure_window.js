'use strict';

(function(exports) {

  var MockSecureWindow = function SecureWindow(config) {
    if (config) {
      for (var key in config) {
        this[key] = config[key];
      }
    }
    this.config = config;
    this.openAnimation = 'fade-in';
    this.closeAnimatin = 'fade-out';
    this.instanceID = 'fakeapp-id';
  };
  MockSecureWindow.prototype.isActive =
  MockSecureWindow.prototype.focus =
  MockSecureWindow.prototype.setVisibleForScreenReader =
  MockSecureWindow.prototype.open =
  MockSecureWindow.prototype.close =
  MockSecureWindow.prototype.kill =
  MockSecureWindow.prototype.softKill =
  MockSecureWindow.prototype.cancelSoftKill =
  MockSecureWindow.prototype.isSoftKillPending =
  MockSecureWindow.prototype.setVisible =
  function() {};

  MockSecureWindow.prototype.isFullScreen =
  function() { return false;};

  exports.MockSecureWindow = MockSecureWindow;
})(window);
