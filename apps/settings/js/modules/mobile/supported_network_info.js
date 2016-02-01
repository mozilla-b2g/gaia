define(function(require) {
  'use strict';

  var NetworkType = require('modules/mobile/supported_network_type');

  var SupportedNetworkInfo = {
    supportedNetworkTypeHelpers: [],

    _getMobileConnectionIndex:
      function ni_getMobileConnectionIndex(mobileConnection) {
        return Array.prototype.indexOf.call(navigator.mozMobileConnections,
          mobileConnection);
    },

    /**
     * The function returns an object of the supporting state of category of
     * network types. The categories are 'gsm', 'cdma', and 'lte'.
     */
    getSupportedNetworkInfo:
      function getSupportedNetworkInfo(mobileConnection, callback) {
        if (!navigator.mozMobileConnections) {
          if (typeof callback === 'function') {
            callback();
          }
        }

        var index = this._getMobileConnectionIndex(mobileConnection);
        var helper = this.supportedNetworkTypeHelpers[index];
        if (!helper) {
          this.supportedNetworkTypeHelpers[index] = helper =
            NetworkType.SupportedNetworkTypeHelper(
              mobileConnection.supportedNetworkTypes);
        }
        if (typeof callback === 'function') {
          callback(helper);
        }
    }
  };

  return SupportedNetworkInfo;
});
