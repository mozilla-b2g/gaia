'use strict';

(function() {
  var mobileConnections =
    Array.prototype.slice.call(navigator.mozMobileConnections || []);
  if (!mobileConnections.length) {
    return;
  }

  // Initialize voice privacy
  var defaultVoicePrivacySettings =
    mobileConnections.map(function() { return false; });
  var voicePrivacyHelper =
    SettingsHelper('ril.voicePrivacy.enabled', defaultVoicePrivacySettings);
  voicePrivacyHelper.get(function gotVP(values) {
    mobileConnections.forEach(function vp_iterator(conn, index) {
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
  });

  // Initialize roaming preference
  var defaultRoamingPreferences =
    mobileConnections.map(function() { return 'any'; });
  var roamingPreferenceHelper =
    SettingsHelper('ril.roaming.preference', defaultRoamingPreferences);
  roamingPreferenceHelper.get(function gotRP(values) {
    mobileConnections.forEach(function rp_iterator(conn, index) {
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
  });
})();
