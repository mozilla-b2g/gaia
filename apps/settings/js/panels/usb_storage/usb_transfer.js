/* global openIncompatibleSettingsDialog */
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
  var AsyncStorage = require('shared/async_storage');

  var _debug = false;
  var debug = function() {};
  if (_debug) {
    debug = function ut_debug(msg) {
      console.log('--> [UsbTransfer]: ' + msg);
    };
  }

  var UsbTransfer = function() {
    this._keyUmsEnabled = 'ums.enabled';
    this._keyUmsMode = 'ums.mode';
    this._keyTransferProtocol = 'usb.transfer';

    this._elements = null;
    this._usbHotProtocolSwitch = false;

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
     * @public
     * @memberOf UsbTransfer.prototype
     */
    init: function ut_init(elements, option) {
      this._elements = elements;
      if (option && option.usbHotProtocolSwitch !== undefined) {
        this._usbHotProtocolSwitch = option.usbHotProtocolSwitch;
      }
      // handle protocol changed function
      SettingsListener.observe(this._keyTransferProtocol, this.PROTOCOL_UMS,
        this._configProtocol.bind(this));

      SettingsListener.observe(this._keyUmsEnabled, false,
        this._umsEnabledHandler.bind(this));

      this._elements.usbEnabledCheckBox.addEventListener('change',
        this._umsCheckboxChange.bind(this));
    },

    /**
     * Handle switch change.
     *
     * @public
     * @memberOf UsbTransfer.prototype
     */
    _umsCheckboxChange: function storage_umsCheckboxChange(evt) {
      var checkbox = evt.target;
      var cset = {};
      var warningKey = 'ums-turn-on-warning';
      debug('state change ' + checkbox.checked);
      if (checkbox.checked) {
        // show warning dialog first time
        AsyncStorage.getItem(warningKey, (showed) => {
          if (!showed) {
            debug('show turn-on warning');
            this._umsTurnOnWarning(checkbox, warningKey);
          } else {
            debug('turn-on warning is showed');
            SettingsCache.getSettings(
              this._openIncompatibleSettingsDialogIfNeeded.bind(this));
          }
        });
      } else {
        cset[this._keyUmsEnabled] = false;
        Settings.mozSettings.createLock().set(cset);
      }
    },

    /**
     * Show UMS Turn on warning dialog.
     *
     * @private
     * @param  {Object} checkbox   switch element
     * @param  {String} warningKey localStorage key
     */
    _umsTurnOnWarning: function storage_umsTurnOnWarning(checkbox, warningKey) {
      DialogService.confirm('ums-confirm', {
        title: 'ums-warning-title',
        submitButton: 'ok',
        cancelButton: 'cancel'
      }).then((result) => {
        var type = result.type;
        if (type === 'submit') {
          debug('turn on success');
          AsyncStorage.setItem(warningKey, true);
          SettingsCache.getSettings(
            this._openIncompatibleSettingsDialogIfNeeded.bind(this));
        } else {
          debug('turn on fail');
          var cset = {};
          cset[this._keyUmsEnabled] = false;
          Settings.mozSettings.createLock().set(cset);

          checkbox.checked = false;
        }
      });
    },

    /**
     * Shpw warning dialog if usb tethering is enabled
     *
     * @private
     * @param  {Object} settings settings result
     */
    _openIncompatibleSettingsDialogIfNeeded:
      function storage_openIncompatibleSettingsDialogIfNeeded(settings) {
        var cset = {};
        var umsSettingKey = this._keyUmsEnabled;
        var oldSetting = 'tethering.usb.enabled';
        var usbTetheringSetting = settings[oldSetting];

        if (!usbTetheringSetting) {
          cset[umsSettingKey] = true;
          Settings.mozSettings.createLock().set(cset);
        } else {
          openIncompatibleSettingsDialog('incompatible-settings-warning',
            umsSettingKey, oldSetting, null);
        }
    },

    /**
     * Change transfer protocol UI based on switch state.
     *
     * @private
     * @param  {Boolean} enabled ums enable state
     */
    _umsEnabledHandler: function ut_umsEnabledHandler(enabled) {
      debug('ums.enabled: ' + enabled);
      this._elements.usbEnabledCheckBox.checked = enabled;
      var i;
      if (enabled) {
        //update selector state based on device-features.json
        if (!this._usbHotProtocolSwitch) {
          for (i = 0; i < this._elements.protocols.length; i++) {
            this._elements.protocols[i].setAttribute('disabled', true);
          }
        }
      } else {
        for (i = 0; i < this._elements.protocols.length; i++) {
          this._elements.protocols[i].removeAttribute('disabled');
        }
      }
    },

    /**
     * Initiate transfer protocol listener and set correspondent keys
     *
     * @private
     * @memberOf UsbTransfer.prototype
     * @param {Number} protocol transfer protocol
     */
    _configProtocol: function ut_configProtocol(protocol) {
      SettingsCache.getSettings((results) => {
        var enabled = results[this._keyUmsEnabled];
        var mode = results[this._keyUmsMode];
        if (enabled) {
          this._changeMode(mode, protocol);
        }
      });
    },

    /**
     * Mode only change when protocol not match current mode
     *
     * @private
     * @memberOf UsbTransfer.prototype
     * @param {Number} mode current mode
     * @param {Number} protocol transfer protocol
     */
    _changeMode: function ut_changeMode(mode, protocol) {
      if (mode !== this.MODE_MTP && protocol === this.PROTOCOL_MTP) {
        this._setMode(this.MODE_MTP);
      } else if (mode === this.MODE_MTP &&
        protocol === this.PROTOCOL_UMS) {
        if (this._partialUmsSupport) {
          debug('show partial warning');
          DialogService.show('ums-partial-warning').then((result) => {
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
    },

    /**
     * Sets the automount mode.
     *
     * @private
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
