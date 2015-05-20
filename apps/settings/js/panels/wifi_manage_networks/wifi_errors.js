define(function(require) {
  'use strict';
  
  var WifiErrors = {
    _errorNameMapping: {
      'wifi is disabled': 'WIFI_IS_DISABLED',
      'wifi has been recorded': 'WIFI_HAS_BEEN_RECORDED',
      'racing associates': 'WIFI_RACING_ASSOCIATE',
      'network is misconfigured': 'WIFI_MISCONFIGURED_NETWORK'
    },
    _localesMapping: {
      WIFI_IS_DISABLED: 'wifi-associate-error-wifi-is-disabled',
      WIFI_HAS_BEEN_RECORDED: 'wifi-associate-error-wifi-has-been-recoreded',
      WIFI_RACING_ASSOCIATE: 'wifi-associate-error-wifi-racing-associate',
      WIFI_MISCONFIGURED_NETWORK: 'wifi-associate-error-misconfigured-network',
      WIFI_UNKNOWN: 'wifi-associate-error-unknown'
    },
    _getIdentifier: function(errorName) {
      if (!errorName) {
        return '';
      }
      errorName = errorName.toLowerCase();
      return this._errorNameMapping[errorName] || 'WIFI_UNKNOWN';
    },
    getL10nId: function(errorName) {
      if (!errorName) {
        return '';
      }
      else {
        var identifier = this._getIdentifier(errorName);
        return this._localesMapping[identifier];
      }
    }
  };

  return WifiErrors;
});
