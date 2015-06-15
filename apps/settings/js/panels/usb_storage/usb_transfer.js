/*
* Handle USB transfer protocol functionality.
* Including key migration and carry value for compatibility.
*
* @module UsbTransfer
*/
define(function(require) {
  'use strict';

  var SettingsCache = require('modules/settings_cache');
  var SettingsListener = require('shared/settings_listener');
  var DialogService = require('modules/dialog_service');

  var UsbTransfer = function() {
    this._keyUmsEnabled = 'ums.enabled';
    this._keyUmsMode = 'ums.mode';
    this._keyTransferProtocol = 'usb.transfer';

    this._partialUmsSupport = !navigator.getDeviceStorages('sdcard').every(
      storage => storage.canBeShared);

    this.PROTOCOL_UMS = '0';
    this.PROTOCOL_MTP = '1';

    this.MODE_UMS = 1;
    this.MODE_MTP = 3;
  };

  UsbTransfer.prototype = {
    /**
     * Initiate transfer protocol listener and set correspondent keys
     *
     * @access public
     * @memberOf UsbTransfer.prototype
     */
    init: function ut_init() {
      // handle protocol changed function
      SettingsListener.observe(this._keyTransferProtocol, this.PROTOCOL_UMS,
        this._configProtocol.bind(this));
    },

    /**
     * Initiate transfer protocol listener and set correspondent keys
     *
     * @access private
     * @memberOf UsbTransfer.prototype
     * @param {Number} protocol transfer protocol
     */
    _configProtocol: function ut_configProtocol(protocol) {
      SettingsCache.getSettings(function(results) {
        var enabled = results[this._keyUmsEnabled];
        var mode = results[this._keyUmsMode];
        if (enabled) {
          this._changeMode(mode, protocol);
        }
      }.bind(this));
    },

    /**
     * Mode only change when protocol not match current mode
     *
     * @access private
     * @memberOf UsbTransfer.prototype
     * @param {Number} mode current mode
     * @param {Number} protocol transfer protocol
     * @return {Promise}
     */
    _changeMode: function ut_changeMode(mode, protocol) {
      if (mode !== this.MODE_MTP && protocol === this.PROTOCOL_MTP) {
        this._setMode(this.MODE_MTP);
      } else if (mode === this.MODE_MTP &&
        protocol === this.PROTOCOL_UMS) {
        if (this._partialUmsSupport) {
          return DialogService.show('partial-ums-warning').then((result) => {
            if (result.type === 'cancel') {
              var param = {};
              param[this._keyTransferProtocol] = this.PROTOCOL_MTP;
              SettingsListener.getSettingsLock().set(param);
            } else {
              this._setMode(this.MODE_UMS);
            }
          });
        } else {
          this._setMode(this.MODE_UMS);
        }
      } else {
        console.log('Error: should not be executed');
      }
      return Promise.resolve();
    },

    /**
     * Sets the automount mode.
     *
     * @access private
     * @memberOf UsbTransfer.prototype
     * @param {Number} mode The value we are setting automount to.
     */
    _setMode: function ut_setMode(mode) {
      var param = {};
      param[this._keyUmsMode] = mode;
      SettingsListener.getSettingsLock().set(param);
    }
  };

  return function ctor_usb_transfer() {
    return new UsbTransfer();
  };
});
