/* global LockScreenBasicComponent, LockScreenClockWidgetStart */
'use strict';

/***/
(function(exports) {
  var LockScreenClockWidgetHalt = function() {
    LockScreenBasicComponent.apply(this);
    this.configs.events = ['screenchange'];
  };

  LockScreenClockWidgetHalt.prototype.handleEvent = function(evt) {
    if ('screenchange' === evt.type && !evt.screenEnabled) {
      return this.transferToStartState();
    }
  };

  LockScreenClockWidgetHalt.prototype.transferToStartState =
  function() {
    return this.transferTo(LockScreenClockWidgetStart);
  };

  exports.LockScreenClockWidgetHalt = LockScreenClockWidgetHalt;
})(window);

