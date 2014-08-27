'use strict';
/* global SettingsListener, System */

(function(exports) {

  /**
   * UsbStorage listens to lock and unlock events and changes the
   * setting which controls automount behavior of USB storage.
   * Storage operates both on lock/unlock events, as well as the
   * ums.enabled setting which is set in the settings app.
   * @class UsbStorage
   */
  function UsbStorage() {
    // Disable ums by default
    this._setMode(this.automounterDisable);
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
     * ums.mode setting value when the automounter is in mtp mode
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
      System.locked = false;
      window.removeEventListener('lockscreen-appopened', this);
      window.removeEventListener('lockscreen-appclosed', this);
      SettingsListener.unobserve(this.umsEnabled,
        this.bindUsbStorageChanged);
    },

    /**
     * Handle USB storage enabled/disabled functionality.
     * @memberof UsbStorage.prototype
     * @param {Boolean} enabled enables/disables automounting.
     */
    _usbStorageChanged: function(enabled) {
      var req = navigator.mozSettings.createLock()
        .get(this.usbTransferProtocol);
      req.onsuccess = function() {
        var protocol = this._keyMigration(
          req.result[this.usbTransferProtocol]);
        this._enabled = enabled;
        this._protocol = protocol;
        this._configUsbTransfer();
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
      } else {
        return protocol;
      }
    },

    /**
     * Set proper usb transfer mode.
     * @memberof UsbStorage.prototype
     * @param {Boolean} enabled enables/disables automounting.
     * @param {Number} protocol current protocol denotes ums or mtp.
     */
    _configUsbTransfer: function() {
      this._mode = this._modeMapping(this._enabled, this._protocol);
      if (System.locked && this._protocol === this.automounterUmsEnable) {
        // covers startup
        // Setting mode due to screen locked
        this._setMode(this.automounterDisable);
      } else {
        // Setting mode due to change in ums.enabled
        this._setMode(this._mode);
      }
    },

    /**
     * Maps a ums.enabled onto an automount value.
     * @memberof UsbStorage.prototype
     * @param {Boolean} enabled enables/disables automounting.
     * @return {Number} The automount enabled/disabled value.
     */
    _modeMapping: function(enabled, protocol) {
      var output = this.automounterDisable;
      if (enabled) {
        if (protocol === this.protocolMTP) {
          output = this.automounterMtpEnable;
        } else {
          output = this.automounterUmsEnable;
        }
      }
      return output;
    },

    /**
     * Sets the automount mode.
     * @memberof UsbStorage.prototype
     * @param {Number} val The value we are setting automount to.
     */
    _setMode: function(val) {
      var param = {};
      param[this.umsMode] = val;
      SettingsListener.getSettingsLock().set(param);
    },

    /**
     * General event handler interface.
     * Updates the overlay with as we receive load events.
     * @memberof UsbStorage.prototype
     * @param  {DOMEvent} evt The event.
     */
    handleEvent: function(e) {
      switch (e.type) {
        case 'lockscreen-appopened':
          // Setting mode due to screen locked
          this._setMode(this.automounterDisableWhenUnplugged);
          break;
        case 'lockscreen-appclosed':
          if (typeof(this._mode) == 'undefined') {
            return;
          }

          // Setting mode due to screen unlocked
          this._setMode(this._mode);
          break;
        default:
          return;
      }
    }
  };

  exports.UsbStorage = UsbStorage;

}(window));
