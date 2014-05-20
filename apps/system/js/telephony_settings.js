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

  /**
   * Initializes caller id restriction based on user setting.
   *
   * CLIR_DEFAULT:     0
   * CLIR_INVOCATION:  1
   * CLIR_SUPPRESSION: 2
   */
  var defaultCallerIdPreferences =
    mobileConnections.map(function() { return 0; });
  var callerIdPreferenceHelper =
    SettingsHelper('ril.clirMode', defaultCallerIdPreferences);

  callerIdPreferenceHelper.get(function got_cid(values) {
    mobileConnections.forEach(function cid_iterator(conn, index) {
      _setCallerIdPreference(conn, values[index], function() {
        _syncCallerIdPreferenceWithCarrier(conn, index,
          callerIdPreferenceHelper);
        _registerListenerForCallerIdPreference(conn, index,
          callerIdPreferenceHelper);
      });
    });
  });

  function _registerListenerForCallerIdPreference(conn, index, helper) {
    // register event handler for caller id preference change, but we should
    // always query the real settings value from the carrier.
    conn.addEventListener('clirmodechange', function onclirchanged(event) {
      _syncCallerIdPreferenceWithCarrier(conn, index, helper);
    });
  }

  function _syncCallerIdPreferenceWithCarrier(conn, index, helper) {
    _getCallerIdPreference(conn, function(realValue) {
      helper.get(function got_cid(values) {
        values[index] = realValue;
        helper.set(values);
      });
    });
  }

  function _getCallerIdPreference(conn, callback) {
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
  }

  function _setCallerIdPreference(conn, callerIdPreference, callback) {
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
  }

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
