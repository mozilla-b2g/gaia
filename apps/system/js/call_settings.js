'use strict';

(function() {
  var mobileConnections = navigator.mozMobileConnections;
  if (!mobileConnections) {
    return;
  }

  var voicePrivacyHelper = VoicePrivacySettingsHelper();
  var initVoicePrivacy = function vp(conn, index) {
    voicePrivacyHelper.getEnabled(index, function gotEnabled(enabled) {
      var setReq = conn.setVoicePrivacyMode(enabled);
      setReq.onerror = function set_vpm_error() {
        if (setReq.error.name === 'RequestNotSupported' ||
            setReq.error.name === 'GenericFailure') {
          console.log('Request not supported.');
        } else {
          console.error('Error setting voice privacy.');
        }
      };
    });
  };

  Array.prototype.forEach.call(mobileConnections, initVoicePrivacy);
})();
