/* global SettingsCache, SettingsListener, AirplaneMode */
/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(exports) {

  var AirplaneModeServiceHelper = {
    _settings: {},
    _initSetting: function(settingID) {
      var self = this;
      var settingEnabledID = settingID + '.enabled';
      var settingSuspendedID = settingID + '.suspended';
      // forget the mozSetting states when user toggle 'xyz' on manually,
      // e.g. set 'xyz'.suspend = false when 'xyz'.enabled === true
      SettingsCache.observe(settingEnabledID,
        '',
        function(value) {
          if (value) {
            self._unsuspend(settingSuspendedID);
          }
        });
      // init and observe the corresponding mozSettings
      // for Data connection, Bluetooth, Wifi, GPS, and NFC
      SettingsCache.observe(settingEnabledID, false,
        function(value) {
          self._settings[settingEnabledID] = value;
        });
      // remember the mozSetting states before the airplane mode disables them
      SettingsCache.observe(settingSuspendedID, false,
        function(value) {
          self._settings[settingSuspendedID] = value;
        });
    },
    // turn off the mozSetting corresponding to `key'
    // and remember its initial state by storing it in another setting
    _suspend: function(key) {
      var enabled = this._settings[key + '.enabled'];
      var suspended = this._settings[key + '.suspended'];

      if (suspended) {
        return;
      }

      // remember the state before switching it to false
      var sset = {};
      sset[key + '.suspended'] = enabled;
      SettingsListener.getSettingsLock().set(sset);

      // switch the state to false if necessary
      if (enabled) {
        var eset = {};
        eset[key + '.enabled'] = false;
        SettingsListener.getSettingsLock().set(eset);
      }
    },
    // turn on the mozSetting corresponding to `key'
    // if it has been suspended by the airplane mode
    _restore: function(key) {
      var suspended = this._settings[key + '.suspended'];

      // clear the 'suspended' state
      var sset = {};
      sset[key + '.suspended'] = false;
      SettingsListener.getSettingsLock().set(sset);

      // switch the state to true if it was suspended
      if (suspended) {
        var rset = {};
        rset[key + '.enabled'] = true;
        SettingsListener.getSettingsLock().set(rset);
      }
    },
    _unsuspend: function(settingSuspendedID) {
      // clear the 'suspended' state
      var sset = {};
      sset[settingSuspendedID] = false;
      SettingsListener.getSettingsLock().set(sset);
    },
    isEnabled: function(key) {
      return this._settings[key + '.enabled'];
    },
    isSuspended: function(key) {
      return this._settings[key + '.suspended'];
    },
    init: function() {
      ['ril.data', 'bluetooth', 'wifi', 'geolocation', 'nfc'].forEach(
        this._initSetting.bind(this)
      );
    },
    updateStatus: function(value) {
      // FM Radio will be turned off in Gecko, more detailed about why we do
      // this in Gecko instead, please check bug 997064.
      var bluetooth = window.navigator.mozBluetooth;
      var wifiManager = window.navigator.mozWifiManager;
      var nfc = window.navigator.mozNfc;

      // Radio is a special service (might not exist e.g. tablet)
      // if value is true,
      // it means Radio.enabled is false
      if (window.Radio) {
        window.Radio.enabled = !value;
      }

      if (value) {

        // Turn off mobile data:
        // we toggle the mozSettings value here just for the sake of UI,
        // platform RIL disconnects mobile data when
        // 'ril.radio.disabled' is true.
        this._suspend('ril.data');

        // Turn off Bluetooth.
        if (bluetooth) {
          this._suspend('bluetooth');
        }

        // Turn off Wifi and Wifi tethering.
        if (wifiManager) {
          this._suspend('wifi');
          SettingsListener.getSettingsLock().set({
            'tethering.wifi.enabled': false
          });
        }

        // Turn off Geolocation.
        this._suspend('geolocation');

        // Turn off NFC
        if (nfc) {
          this._suspend('nfc');
        }
      } else {
        // Note that we don't restore Wifi tethering when leaving airplane mode
        // because Wifi tethering can't be switched on before data connection is
        // established.

        // Don't attempt to turn on mobile data if it's already on
        if (!this._settings['ril.data.enabled']) {
          this._restore('ril.data');
        }

        // Don't attempt to turn on Bluetooth if it's already on
        if (bluetooth && !bluetooth.enabled) {
          this._restore('bluetooth');
        }

        // Don't attempt to turn on Wifi if it's already on
        if (wifiManager && !wifiManager.enabled) {
          this._restore('wifi');
        }

        // Don't attempt to turn on Geolocation if it's already on
        if (!this._settings['geolocation.enabled']) {
          this._restore('geolocation');
        }

        // Don't attempt to turn on NFC if it's already on
        if (nfc && !this._settings['nfc.enabled']) {
          this._restore('nfc');
        }
      }
    }
  };

  // main
  var AirplaneMode = {
    /*
     * We will cache the helper as our internal value
     */
    _serviceHelper: AirplaneModeServiceHelper,

    /*
     * This is an internal key to store current state of AirplaneMode
     */
    _enabled: null,

    /*
     * This is an event mapping table that will help us wait for
     * specific event from its manager to make sure we are now
     * in airplane mode or not.
     */
    _checkedActionsMap: {
      wifi: {
        enabled: 'wifi-enabled',
        disabled: 'wifi-disabled'
      },
      bluetooth: {
        enabled: 'bluetooth-adapter-added',
        disabled: 'bluetooth-disabled'
      },
      radio: {
        enabled: 'radio-enabled',
        disabled: 'radio-disabled'
      }
    },

    /*
     * When turning on / off airplane mode, we will start watching
     * needed events to make sure we are in airplane mode or not.
     *
     * @param {boolean} value
     * @param {Object} checkedActions
     */
    watchEvents: function(value, checkedActions) {
      var self = this;
      // We don't want to wait until the first event reacts in order to
      // update the status, because we can set the status to 'enabling' or
      // 'disabling' already through `_updateAirplaneModeStatus`.
      self._updateAirplaneModeStatus(checkedActions);
      for (var serviceName in this._checkedActionsMap) {

        // if we are waiting for specific service
        if (serviceName in checkedActions) {
          var action = value ? 'disabled' : 'enabled';
          var eventName = this._checkedActionsMap[serviceName][action];

          // then we will start watch events coming from its manager
          window.addEventListener(eventName,
            (function(eventName, serviceName) {
              return function toUpdateAirplaneMode() {
                window.removeEventListener(eventName, toUpdateAirplaneMode);
                checkedActions[serviceName] = true;
                self._updateAirplaneModeStatus(checkedActions);
              };
          }(eventName, serviceName)));
        }
      }
    },

    /*
     * This is a ES5 feature that can help the others easily get/set
     * AirplaneMode.
     *
     * @param {boolean} value
     */
    set enabled(value) {
      if (value !== this._enabled) {
        this._enabled = value;

        // start watching events
        this.watchEvents(value, this._getCheckedActions(value));

        // tell services to do their own operations
        this._serviceHelper.updateStatus(value);
      }
    },

    /*
     * This is a ES5 feature that can help the others easily get AirplaneMode
     * states.
     *
     * @return {boolean}
     */
    get enabled() {
      return this._enabled;
    },

    /*
     * In order to make sure all needed managers work successfully. We have to
     * use this method to update airplaneMode related keys to tell
     * AirplaneModeHelper our current states and is finised or not.
     */
    _updateAirplaneModeStatus: function(checkActions) {
      var self = this;
      var areAllActionsDone;

      areAllActionsDone = this._areCheckedActionsAllDone(checkActions);

      if (areAllActionsDone) {
        SettingsListener.getSettingsLock().set({
          'airplaneMode.enabled': self._enabled,
          'airplaneMode.status': self._enabled ? 'enabled' : 'disabled',
          // NOTE
          // this is for backward compatibility,
          // because we will update this value only when airplane mode
          // is on / off, it will not affect apps using this value
          'ril.radio.disabled': self._enabled
        });
      } else {
        // keep updating the status to reflect current status
        SettingsListener.getSettingsLock().set({
          'airplaneMode.status': self._enabled ? 'enabling' : 'disabling'
        });
      }
    },

    /*
     * By default, these three API takes longer time and with success / error
     * callback. we just have to wait for these three items.
     *
     * @param {boolean} value
     * @return {Object} checkedActions
     */
    _getCheckedActions: function(value) {
      // we have to re-init all need-to-check managers
      var checkedActions = {};

      if (value === true) {
        // check connection
        if (window.Radio) {
          checkedActions.radio = false;
        }

        // check bluetooth
        if (this._serviceHelper.isEnabled('bluetooth')) {
          checkedActions.bluetooth = false;
        }

        // check wifi
        if (this._serviceHelper.isEnabled('wifi')) {
          checkedActions.wifi = false;
        }
      } else {
        // check connection
        if (window.Radio) {
          checkedActions.radio = false;
        }

        // check bluetooth
        if (this._serviceHelper.isSuspended('bluetooth')) {
          checkedActions.bluetooth = false;
        }

        // check wifi
        if (this._serviceHelper.isSuspended('wifi')) {
          checkedActions.wifi = false;
        }
      }

      return checkedActions;
    },

    /*
     * We have to use this method to check whether all actions
     * are done or not.
     *
     * @return {boolean}
     */
    _areCheckedActionsAllDone: function(checkedActions) {
      for (var key in checkedActions) {
        if (checkedActions[key] === false) {
          return false;
        }
      }
      return true;
    },

    /*
     * Entry point
     */
    init: function apm_init() {
      var self = this;

      this._serviceHelper.init();

      // monitor airplaneMode communication key change
      SettingsCache.observe('airplaneMode.enabled', false, function(value) {
        self.enabled = value;
      });

      /*
       * If we are in airplane mode and the user just dial out an
       * emergency call, we have to exit airplane mode.
       */
      if (window.Radio) {
        window.Radio.addEventListener('radiostatechange', function(state) {
          if (state === 'enabled' && this._enabled === true) {
            this.enabled = false;
          }
        }.bind(this));
      }
    }
  };

  exports.AirplaneMode = AirplaneMode;
})(window);

if (document && (document.readyState === 'complete' ||
                 document.readyState === 'interactive')) {
  setTimeout(AirplaneMode.init.bind(AirplaneMode));
} else {
  window.addEventListener('load', function onload() {
    window.removeEventListener('load', onload);
    AirplaneMode.init();
  });
}
