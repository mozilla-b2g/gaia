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
    }
  };

  exports.TelephonySettings = TelephonySettings;

}(window));
