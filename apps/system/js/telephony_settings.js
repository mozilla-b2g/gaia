'use strict';
/* global BaseModule */

(function() {
  /**
   * TelephonySettings sets voice privacy and roaming modes based on
   * the users saved settings.
   * @class TelephonySettings
   */
  function TelephonySettings(core) {
    this.started = false;
    this.connections = Array.slice(core.mobileConnections || []);
  }

  TelephonySettings.SETTINGS = [
    'ril.voicePrivacy.enabled',
    'ril.roaming.preference',
    'ril.clirMode',
    'ril.radio.preferredNetworkType'
  ];

  BaseModule.create(TelephonySettings, {
    name: 'TelephonySettings',

    '_observe_ril.voicePrivacy.enabled' : function(values) {
      values = values || this.connections.map(function() { return false; });
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
    },

    '_observe_ril.roaming.preference': function(values) {
      if (!values) {
        return;
      }
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
    },

    /**
     * Initializes caller id restriction based on user setting.
     *
     * CLIR_DEFAULT:     0
     * CLIR_INVOCATION:  1
     * CLIR_SUPPRESSION: 2
     */
    '_observe_ril.clirMode': function(values) {
      this.connections.forEach(function cid_iterator(conn, index) {
        if (values && values[index] !== null) {
          this._setCallerIdPreference(conn, values[index], function() {
            this._syncCallerIdPreferenceWithCarrier(conn, index);
            this._registerListenerForCallerIdPreference(conn, index);
          }.bind(this));
        } else {
          this._registerListenerForCallerIdPreference(conn, index);
        }
      }, this);
    },

    _registerListenerForCallerIdPreference: function(conn, index) {
      // register event handler for caller id preference change, but we should
      // always query the real settings value from the carrier.
      conn.addEventListener('clirmodechange', function onclirchanged(event) {
        this._syncCallerIdPreferenceWithCarrier(conn, index);
      }.bind(this));
    },

    _syncCallerIdPreferenceWithCarrier: function(conn, index) {
      var that = this;
      this._getCallerIdPreference(conn, function(realValue) {
        var values = that._settings['ril.clirMode'];
        values = values || that.connections.map(function() {
          return 0;
        });
        values[index] = realValue;
        that.writeSetting({
          'ril.clirMode': values
        });
      }.bind(this));
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
    '_observe_ril.radio.preferredNetworkType': function got_pnt(values) {
      if (!values) {
        values = this._getDefaultPreferredNetworkTypes();
        this.writeSetting({
          'ril.radio.preferredNetworkType': values
        });
      } else if (typeof values == 'string') {
        // do the migration
        var tempDefault = this._getDefaultPreferredNetworkTypes();
        tempDefault[0] = values;
        values = tempDefault;
        this.writeSetting({
          'ril.radio.preferredNetworkType': values
        });
      }

      this.connections.forEach(function pnt_iterator(conn, index) {
        this._setDefaultPreferredNetworkType(conn, values[index]);
      }, this);
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
