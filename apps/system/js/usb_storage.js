'use strict';
/* global SettingsListener, Service */

(function(exports) {

  const DEBUG = false;
  var debug = function(str) {
    //dump('usb_storage: ' + str + '\n');
    console.log('usb_storage: ' + str);
  };

  /**
   * UsbStorage listens to lock and unlock events and changes the
   * setting which controls automount behavior of USB storage.
   * Storage operates both on lock/unlock events, as well as the
   * ums.enabled setting which is set in the settings app.
   *
   * Once storage has been enabled (which requires the phone to be
   * unlocked), we want to keep it enabled, even if the phone is
   * locked afterwards. However, unplugging the USB cable should
   * then require being unlocked before enabling again.
   *
   * This also needs to work properly if the lockscreen is
   * disabled.
   *
   * Some further potential wrinkles:
   *
   * - MTP can be enabled/disabled at will
   * - UMS can be enabled at will, but requires a USB cable unplug
   *   to complete.
   *
   * @class UsbStorage
   */
  function UsbStorage() {
    // The AutoMounter already sets ums.mode to disabled at startup, so we
    // just set our internal state. We shouldn't blindly call _setMode since
    // when B2G is restarted, it only restarts the b2g executable, and
    // vold isn't restarted. So we need to adapt to the initial conditions
    // not set them.
    this._mode = this.automounterDisable;
    this.bindUsbStorageChanged = this._usbStorageChanged.bind(this);
    this.start();
  }

  UsbStorage.prototype = {

    /**
     * ums.mode setting value when the automounter is disabled.
     * @memberof UsbStorage.prototype
     * @type {Number}
     */
    automounterDisable: 0,

    /**
     * ums.mode setting value when the automounter is enabled.
     * @memberof UsbStorage.prototype
     * @type {Number}
     */
    automounterUmsEnable: 1,

    /**
     * ums.mode setting value when the automounter is disabled
     * during the lock event.
     * @memberof UsbStorage.prototype
     * @type {Number}
     */
    automounterDisableWhenUnplugged: 2,

    /**
     * ums.mode setting value when the automounter is in mtp modenot
     * mcuy
     * @memberof UsbStorage.prototype
     * @type {Number}
     */
    automounterMtpEnable: 3,

    /**
     * usb.transter setting value for ums mode
     * @memberof UsbStorage.prototype
     * @type {String}
     */
    protocolUMS: '0',

    /**
     * ums.mode setting value for mtp mode
     * @memberof UsbStorage.prototype
     * @type {String}
     */
    protocolMTP: '1',

    /**
     * The name of the setting to enable or disable USB storage.
     * @memberof UsbStorage.prototype
     * @type {String}
     */
    umsEnabled: 'ums.enabled',

    /**
     * The name of the setting that defines automount behavior.
     * @memberof UsbStorage.prototype
     * @type {String}
     */
    umsMode: 'ums.mode',

    /**
     * The name of the setting that defines usb transfer protocol.
     * @memberof UsbStorage.prototype
     * @type {String}
     */
    usbTransferProtocol: 'usb.transfer',

    /**
     * The current value of USB tranfer mode.
     * @memberof UsbStorage.prototype
     * @type {String}
     */
    _mode: undefined,

    /**
     * The current value of whether or not USB storage is enabled.
     * @memberof UsbStorage.prototype
     * @type {Boolean}
     */
    _enabled: undefined,

    /**
     * The current value of current USB transfer protocol.
     * @memberof UsbStorage.prototype
     * @type {String}
     */
    _protocol: undefined,

    /**
     * start usb storage
     * @memberof UsbStorage.prototype
     */
    start: function() {
      DEBUG && debug('UsbStorage.start called');
      window.addEventListener('lockscreen-appopened', this);
      window.addEventListener('lockscreen-appclosed', this);
      SettingsListener.observe(this.umsEnabled, false,
        this.bindUsbStorageChanged);
    },

    /**
     * stop usb storage
     * @memberof UsbStorage.prototype
     */
    stop: function() {
      DEBUG && debug('UsbStorage.stop called');
      window.removeEventListener('lockscreen-appopened', this);
      window.removeEventListener('lockscreen-appclosed', this);
      SettingsListener.unobserve(this.umsEnabled,
        this.bindUsbStorageChanged);
    },

    /**
     * Get a string version of the protocol.
     * @memberof UsbStorage.prototype
     * @param {Number} protocol current protocol denotes ums or mtp.
     */

    _protocolStr: function(protocol) {
      if (protocol == this.protocolUMS) {
        return 'UMS';
      }
      if (protocol == this.protocolMTP) {
        return 'MTP';
      }
      return '???';
    },

    /**
     * Get a string version of the mode.
     * @memberof UsbStorage.prototype
     * @param {Number} mode for automounter.
     */

    _modeStr: function(mode) {
      if (mode == this.automounterDisable) {
        return 'Disabled';
      }
      if (mode == this.automounterUmsEnable) {
        return 'Enable-UMS';
      }
      if (mode == this.automounterDisableWhenUnplugged) {
        return 'DisabledWhenUnplugged';
      }
      if (mode == this.automounterMtpEnable) {
        return 'Enable-MTP';
      }
      return '???';
    },

    /**
     * Handle USB storage enabled/disabled functionality.
     * @memberof UsbStorage.prototype
     * @param {Boolean} enabled enables/disables automounting.
     */
    _usbStorageChanged: function(enabled) {
      this._enabled = enabled;
      DEBUG && debug('USB Storage Changed: ' + enabled);
      this._getUsbProtocol();
    },

    /**
     * Retrieve the protocol so that that we know whether MTP or UMS
     * was enabled/disabled.
     * @memberof UsbStorage.prototype
     */
    _getUsbProtocol: function() {
      var req = navigator.mozSettings.createLock()
        .get(this.usbTransferProtocol);
      req.onsuccess = function() {
        var protocol = this._keyMigration(
          req.result[this.usbTransferProtocol]);
        this._protocol = protocol;
        DEBUG && debug('_getUsbProtocol: ' + this._protocolStr(protocol));
        this._updateMode();
      }.bind(this);
    },

    /**
     * Set mtp mode as default value.
     * @memberof UsbStorage.prototype
     * @param {Number} protocol current protocol denotes ums or mtp.
     */
    _keyMigration: function(protocol) {
      if (protocol === undefined) {
        var cset = {};
        cset[this.usbTransferProtocol] = this.protocolUMS;
        navigator.mozSettings.createLock().set(cset);
        return this.protocolUMS;
      }
      return protocol;
    },

    /**
     * Sets the mode to agree with the current state of things.
     * @memberof UsbStorage.prototype
     */
    _updateMode: function() {
      if (typeof(this._enabled) == 'undefined') {
        DEBUG && debug('_updateMode: _enabled not yet set - ignoring');
        return;
      }

      var mode = this.automounterDisable;

      if (this._enabled && !Service.query('locked')) {
        // This is the only time that UMS or MTP should be enabled.
        if (this._protocol == this.protocolMTP) {
          mode = this.automounterMtpEnable;
        } else {
          mode = this.automounterUmsEnable;
        }
      } else {
        // DisableWhenUnplugged can also be interpreted as EnableUntilUnplugged
        // so we need to make sure that we only transition to
        // automounterDisableWhenUnplugged if we're already in an enabled mode.

        if (this._mode != this.automounterDisable &&
            (this._protocol == this.protocolUMS || this._enabled)) {
          // For UMS, we can't disable immediately, so we always defer
          // to when the usb cable is unplugged.
          // For MTP, if the user disables it, we can act immediately, but
          // for screen lock we want to defer until the usb cable is unplugged.
          mode = this.automounterDisableWhenUnplugged;
        }
      }

      this._setMode(mode);
    },

    /**
     * Sets the automount mode. This is split into a separate
     * function to facilitate testing, and should only be called
     * from _updateMode().
     * @memberof UsbStorage.prototype
     * @param {Number} val The value we are setting automount to.
     * */
    _setMode: function(mode) {
      if (mode != this._mode) {
        this._mode = mode;
        var param = {};
        param[this.umsMode] = mode;
        SettingsListener.getSettingsLock().set(param);
      }
    },


     /**
      * General event handler interface.
      * Updates the overlay with as we receive load events.
      * @memberof UsbStorage.prototype
      * @param {DOMEvent} evt The event.
      */
    handleEvent: function(e) {
      switch (e.type) {
        case 'lockscreen-appopened':
        case 'lockscreen-appclosed':
          this._updateMode();
          break;
        default:
          return;
      }
    }
  };

  exports.UsbStorage = UsbStorage;

}(window));
