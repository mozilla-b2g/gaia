/* global LockScreenBasicComponent, LockScreenClockWidgetTick */
'use strict';

/***/
(function(exports) {
  var LockScreenClockWidgetSuspend = function() {
    LockScreenBasicComponent.apply(this);
    this.configs.name = 'LockScreenClockWidgetSuspend';
    this.configs.events = ['screenchange'];
  };
  LockScreenClockWidgetSuspend.prototype =
    Object.create(LockScreenBasicComponent.prototype);

  LockScreenClockWidgetSuspend.prototype.handleEvent = function(evt) {
    if ('screenchange' === evt.type && !evt.screenEnabled) {
      return this.transferToTickState();
    }
  };

  LockScreenClockWidgetSuspend.prototype.transferToTickState =
  function() {
    return this.transferTo(LockScreenClockWidgetTick);
  };

  exports.LockScreenClockWidgetSuspend = LockScreenClockWidgetSuspend;
})(window);

