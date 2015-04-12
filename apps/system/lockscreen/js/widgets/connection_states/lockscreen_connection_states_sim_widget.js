/* global LockScreenSettingsCache */
/* global LockScreenBasicComponent */
/* global LockScreenConnectionStatesWidget */
/* global LockScreenConnectionStatesSIMWidgetSetup */
'use strict';

/***/
(function(exports) {
  var LockScreenConnectionStatesSIMWidget = function(view) {
    LockScreenBasicComponent.call(this, view);
    this._settingsCache = new LockScreenSettingsCache();
    // SIMSlot object from SIMSlotManager
    this.resources.simslot = null;
    this.resources.telephonyDefaultServiceId = null;
    this.resources.elements = {
      'view': view,                           // The line wrapper
      'line': '.lockscreen-connstate-line',    // The line.
      'id'  : '.lockscreen-conn-states-simid'  // The SIMID label
    };
    this.configs.logger.debug = true;  // turn on this when we're debugging
  };
  LockScreenConnectionStatesSIMWidget.prototype =
    Object.create(LockScreenBasicComponent.prototype);

  LockScreenConnectionStatesSIMWidget.prototype.setup = function() {
    return (new LockScreenConnectionStatesSIMWidgetSetup(this));
  };

  LockScreenConnectionStatesSIMWidget.prototype.fetchTelephonyServiceId =
  function() {
    return this._settingsCache.get('ril.telephony.defaultServiceId')
      .then((id) => {
        this.resources.telephonyDefaultServiceId = id;
        return id;
      });
  };

  /**
   * Refer parent component's stateless (not static) method violate
   * no principle that child shouldn't know anything about parent.
   */
  LockScreenConnectionStatesSIMWidget.prototype.writeLabel =
    LockScreenConnectionStatesWidget.prototype.writeLabel;

  LockScreenConnectionStatesSIMWidget.prototype.eraseLabel =
    LockScreenConnectionStatesWidget.prototype.eraseLabel;

  exports.LockScreenConnectionStatesSIMWidget =
    LockScreenConnectionStatesSIMWidget;
})(window);

