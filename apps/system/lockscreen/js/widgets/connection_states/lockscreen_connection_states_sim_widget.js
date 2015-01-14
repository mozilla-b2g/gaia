/* global LockScreenBasicComponent */
/* global LockScreenConnectionStatesSIMWidgetSetup */
'use strict';

/***/
(function(exports) {
  var LockScreenConnectionStatesSIMWidget = function() {
    LockScreenBasicComponent.apply(this);
    // SIMSlot object from SIMSlotManager
    this.resources.simslot = null;
    this.resources.telephonyDefaultServiceId = null;
    this.resources.elements = {
      'view': null,                           // The line wrapper
      'line': 'lockscreen-connstate-line',    // The line.
      'id'  : 'lockscreen-conn-states-simid'  // The SIMID label
    };
  };
  LockScreenConnectionStatesSIMWidget.prototype =
    Object.create(LockScreenBasicComponent.prototype);

  LockScreenConnectionStatesSIMWidget.prototype.setup = function() {
    return (new LockScreenConnectionStatesSIMWidgetSetup(this));
  };

  /* TODO: methods like this should be cached via SettingsCache. */
  LockScreenConnectionStatesSIMWidget.prototype.fetchTelephonlyServiceId =
  function() {
    return new Promise((resolve, reject) => {
      var lock = navigator.mozSettings.createLock();
      var request = lock.get('ril.telephony.defaultServiceId');
      request.onsuccess = () => {
        this.resources.telephonyDefaultServiceId = request.result;
        resolve(request.result);
      };
      request.onerror = reject;
    });
  };

  exports.LockScreenConnectionStatesSIMWidget =
    LockScreenConnectionStatesSIMWidget;
})(window);

