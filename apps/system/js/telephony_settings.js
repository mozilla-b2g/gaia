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

  // Initialize preferred network type
  function _setDefaultPreferredNetworkType(conn, preferredNetworkType) {
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
  }

  /**
   * Returns an array specifying the default preferred network types of all
   * mobile connections.
   */
  function _getDefaultPreferredNetworkTypes() {
    return mobileConnections.map(function(conn) {
      return _getDefaultPreferredNetworkType(conn.supportedNetworkTypes);
    });
  }

  /**
   * Returns the default preferred network types based on the hardware
   * supported network types.
   */
  function _getDefaultPreferredNetworkType(hwSupportedTypes) {
    return ['lte', 'wcdma', 'gsm', 'cdma', 'evdo'].filter(function(type) {
      return (hwSupportedTypes.indexOf(type) !== -1);
    }).join('/');
  }

  /**
   * If the default value is null, we should use the option that makes the
   * device able to connect all supported netwrok types.
   */
  var preferredNetworkTypeHelper =
    SettingsHelper('ril.radio.preferredNetworkType');
  preferredNetworkTypeHelper.get(function got_pnt(values) {
    if (!values) {
      values = _getDefaultPreferredNetworkTypes();
      preferredNetworkTypeHelper.set(values);
    } else if (typeof values == 'string') {
      // do the migration
      var tempDefault = _getDefaultPreferredNetworkTypes();
      tempDefault[0] = values;
      values = tempDefault;
      preferredNetworkTypeHelper.set(values);
    }

    mobileConnections.forEach(function pnt_iterator(conn, index) {
      _setDefaultPreferredNetworkType(conn, values[index]);
    });
  });
})();
