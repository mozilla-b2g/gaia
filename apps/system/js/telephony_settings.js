'use strict';
/* global SettingsHelper, BaseModule, LazyLoader */

(function() {
  /**
   * TelephonySettings sets voice privacy and roaming modes based on
   * the users saved settings.
   * @requires SettingsHelper
   * @class TelephonySettings
   */
  function TelephonySettings(core) {
    this.started = false;
    this.connections = Array.slice(core.mobileConnections || []);
  }

  BaseModule.create(TelephonySettings, {
    name: 'TelephonySettings',
    /**
     * Initialzes all settings.
     * @memberof TelephonySettings.prototype
     */
    _start: function() {
      // XXX: Deprecate SettingsHelper usage in system app
      // and use this.readSetting instead.
      return LazyLoader.load('shared/js/settings_helper.js').then(() => {
        this.initVoicePrivacy();
        this.initRoaming();
        this.initCallerIdPreference();
        this.initPreferredNetworkType();
      });
    },

    /**
     * Initializes voice privacy based on user setting.
     */
    initVoicePrivacy: function() {
      var defaultVoicePrivacySettings =
        this.connections.map(function() { return false; });
      var voicePrivacyHelper =
        SettingsHelper('ril.voicePrivacy.enabled', defaultVoicePrivacySettings);
      voicePrivacyHelper.get(function got_vp(values) {
        this.connections.forEach(function vp_iterator(conn, index) {
          var setReq = conn.setVoicePrivacyMode(values[index]);
          setReq.onerror = function set_vpm_error() {
            if (setReq.error.name === 'RequestNotSupported' ||
                setReq.error.name === 'GenericFailure') {
              console.log('Request not supported.');
            } else {
              console.error('Error setting voice privacy.');
            }
          };
        });
      }.bind(this));
    },

    /**
     * Initializes roaming based on user setting.
     */
    initRoaming: function() {
      var defaultRoamingPreferences =
        this.connections.map(function() { return 'any'; });
      var roamingPreferenceHelper =
        SettingsHelper('ril.roaming.preference', defaultRoamingPreferences);
      roamingPreferenceHelper.get(function got_rp(values) {
        this.connections.forEach(function rp_iterator(conn, index) {
          var setReq = conn.setRoamingPreference(values[index]);
          setReq.onerror = function set_vpm_error() {
            if (setReq.error.name === 'RequestNotSupported' ||
                setReq.error.name === 'GenericFailure') {
              console.log('Request not supported.');
            } else {
              console.error('Error roaming preference.');
            }
          };
        });
      }.bind(this));
    },

    /**
     * Initializes caller id restriction based on user setting.
     *
     * CLIR_DEFAULT:     0
     * CLIR_INVOCATION:  1
     * CLIR_SUPPRESSION: 2
     */
    initCallerIdPreference: function() {
      var callerIdPreferenceHelper = SettingsHelper('ril.clirMode', null);
      var that = this;

      callerIdPreferenceHelper.get(function got_cid(values) {
        that.connections.forEach(function cid_iterator(conn, index) {
          if (values && values[index] !== null) {
            that._setCallerIdPreference(conn, values[index], function() {
              that._syncCallerIdPreferenceWithCarrier(conn, index,
                callerIdPreferenceHelper);
              that._registerListenerForCallerIdPreference(conn, index,
                callerIdPreferenceHelper);
            });
          } else {
            that._registerListenerForCallerIdPreference(conn, index,
              callerIdPreferenceHelper);
          }
        });
      });
    },

    _registerListenerForCallerIdPreference: function(conn, index, helper) {
      // register event handler for caller id preference change, but we should
      // always query the real settings value from the carrier.
      conn.addEventListener('clirmodechange', function onclirchanged(event) {
        this._syncCallerIdPreferenceWithCarrier(conn, index, helper);
      }.bind(this));
    },

    _syncCallerIdPreferenceWithCarrier: function(conn, index, helper) {
      var that = this;
      this._getCallerIdPreference(conn, function(realValue) {
        helper.get(function got_cid(values) {
          values = values || that.connections.map(function() {
            return 0;
          });
          values[index] = realValue;
          helper.set(values);
        });
      });
    },

    _getCallerIdPreference: function(conn, callback) {
      var req = conn.getCallingLineIdRestriction();
      req.onsuccess = req.onerror = function(event) {
        var value = 0;
        if (req.result) {
          switch (req.result.m) {
            case 1: // Permanently provisioned
            case 3: // Temporary presentation disallowed
            case 4: // Temporary presentation allowed
              value = req.result.n;
              break;
            case 0: // Not Provisioned
            case 2: // Unknown (network error, etc)
              value = 0;
              break;
            default:
              value = 0;
              break;
          }
        }

        if (callback) {
          callback(value);
        }
      };
    },

    _setCallerIdPreference: function(conn, callerIdPreference, callback) {
      if (!conn.setCallingLineIdRestriction) {
        if (callback) {
          callback();
        }
        return;
      }

      var doSet = function() {
        var setReq = conn.setCallingLineIdRestriction(callerIdPreference);
        setReq.onsuccess = function set_cid_success() {
          if (callback) {
            callback();
          }
        };
        setReq.onerror = function set_cid_error() {
          console.error('Error set caller id restriction.');
          if (callback) {
            callback();
          }
        };
      };

      // Waiting for voice connected
      if (conn.voice && conn.voice.connected) {
        doSet();
      } else {
        conn.addEventListener('voicechange', function onchange() {
          if (conn.voice && conn.voice.connected) {
            conn.removeEventListener('voicechange', onchange);
            doSet();
          }
        });
      }
    },

    /**
     * Initialize preferred network type. If the default value is null, we
     * should use the option that makes the device able to connect all supported
     * netwrok types.
     */
    initPreferredNetworkType: function() {
      var preferredNetworkTypeHelper =
        SettingsHelper('ril.radio.preferredNetworkType');
      preferredNetworkTypeHelper.get(function got_pnt(values) {
        if (!values) {
          values = this._getDefaultPreferredNetworkTypes();
          preferredNetworkTypeHelper.set(values);
        } else if (typeof values == 'string') {
          // do the migration
          var tempDefault = this._getDefaultPreferredNetworkTypes();
          tempDefault[0] = values;
          values = tempDefault;
          preferredNetworkTypeHelper.set(values);
        }

        this.connections.forEach(function pnt_iterator(conn, index) {
          this._setDefaultPreferredNetworkType(conn, values[index]);
        }, this);
      }.bind(this));
    },

    _setDefaultPreferredNetworkType: function(conn, preferredNetworkType) {
      var doSet = function() {
        var setReq = conn.setPreferredNetworkType(preferredNetworkType);
        setReq.onerror = function set_vpm_error() {
          console.error('Error setting preferred network type: ' +
            preferredNetworkType);
        };
      };
      if (conn.radioState === 'enabled') {
        doSet();
      } else {
        conn.addEventListener('radiostatechange', function onchange() {
          if (conn.radioState === 'enabled') {
            conn.removeEventListener('radiostatechange', onchange);
            doSet();
          }
        });
      }
    },

    /**
     * Returns an array specifying the default preferred network types of all
     * mobile connections.
     */
    _getDefaultPreferredNetworkTypes: function() {
      return this.connections.map(function(conn) {
        return this._getDefaultPreferredNetworkType(conn.supportedNetworkTypes);
      }, this);
    },

    /**
     * Returns the default preferred network types based on the hardware
     * supported network types.
     */
    _getDefaultPreferredNetworkType: function(hwSupportedTypes) {
      return ['lte', 'wcdma', 'gsm', 'cdma', 'evdo'].filter(function(type) {
        return (hwSupportedTypes && hwSupportedTypes.indexOf(type) !== -1);
      }).join('/');
    }
  });

}());
