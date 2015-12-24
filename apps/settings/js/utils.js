/* global MozActivity, LazyLoader, SupportedNetworkTypeHelper */
/* exported openLink, openIncompatibleSettingsDialog */
'use strict';

/**
 * Open a link with a web activity
 */
function openLink(url) {
  /* jshint nonew: false */
  if (url.startsWith('tel:')) { // dial a phone number
    new MozActivity({
      name: 'dial',
      data: { type: 'webtelephony/number', number: url.substr(4) }
    });
  } else if (!url.startsWith('#')) { // browse a URL
    new MozActivity({
      name: 'view',
      data: { type: 'url', url: url }
    });
  }
}

/**
 * The function returns an object of the supporting state of category of network
 * types. The categories are 'gsm', 'cdma', and 'lte'.
 */
(function(exports) {
  var supportedNetworkTypeHelpers = [];

  var helperFuncReady = function(callback) {
    if (exports.SupportedNetworkTypeHelper) {
      if (typeof callback === 'function') {
        callback();
      }
    } else {
      LazyLoader.load(['js/supported_network_type_helper.js'], function() {
        if (typeof callback === 'function') {
          callback();
        }
      });
    }
  };

  var getMobileConnectionIndex = function(mobileConnection) {
    return Array.prototype.indexOf.call(navigator.mozMobileConnections,
      mobileConnection);
  };

  var getSupportedNetworkInfo = function(mobileConnection, callback) {
    if (!navigator.mozMobileConnections) {
      if (typeof callback === 'function') {
        callback();
      }
    }

    helperFuncReady(function ready() {
      var index = getMobileConnectionIndex(mobileConnection);
      var supportedNetworkTypeHelper = supportedNetworkTypeHelpers[index];
      if (!supportedNetworkTypeHelper) {
        supportedNetworkTypeHelpers[index] = supportedNetworkTypeHelper =
          SupportedNetworkTypeHelper(mobileConnection.supportedNetworkTypes);
      }
      if (typeof callback === 'function') {
        callback(supportedNetworkTypeHelper);
      }
    });
  };

  exports.getSupportedNetworkInfo = getSupportedNetworkInfo;
})(window);
