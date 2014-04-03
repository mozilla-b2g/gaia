'use strict';
/* global SettingsHelper */

(function(exports) {
  /**
   * TelephonySettings sets voice privacy and roaming modes based on
   * the users saved settings.
   * @requires SettingsHelper
   * @class TelephonySettings
   */
  function TelephonySettings() {
    this.started = false;
    this.connections = Array.slice(navigator.mozMobileConnections || []);
  }

  TelephonySettings.prototype = {

    /**
     * Initialzes all settings.
     * @memberof TelephonySettings.prototype
     */
    start: function() {
      if (this.started || !this.connections.length) {
        return;
      }

      this.initVoicePrivacy();
      this.initRoaming();
      this.initPreferredNetworkType();

      this.started = true;
    },

    /**
     * Initializes voice privacy based on user setting.
     */
    initVoicePrivacy: function() {
      var defaultVoicePrivacySettings =
        this.connections.map(function() { return false; });
      var voicePrivacyHelper =
        SettingsHelper('ril.voicePrivacy.enabled', defaultVoicePrivacySettings);
      voicePrivacyHelper.get(function gotVP(values) {
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
      roamingPreferenceHelper.get(function gotRP(values) {
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
        return (hwSupportedTypes.indexOf(type) !== -1);
      }).join('/');
    }
  };

  exports.TelephonySettings = TelephonySettings;

}(window));
