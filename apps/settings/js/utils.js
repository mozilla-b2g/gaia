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

function openIncompatibleSettingsDialog(dialogId, newSetting,
  oldSetting, callback) {
  var headerL10nMap = {
    'ums.enabled': 'is-warning-storage-header',
    'tethering.usb.enabled': 'is-warning-tethering-header',
    'tethering.wifi.enabled': 'is-warning-wifi-header'
  };
  var messageL10nMap = {
    'ums.enabled': {
      'tethering.usb.enabled': 'is-warning-storage-tethering-message'
    },
    'tethering.usb.enabled': {
      'ums.enabled': 'is-warning-tethering-storage-message',
      'tethering.wifi.enabled': 'is-warning-tethering-wifi-message'
    },
    'tethering.wifi.enabled': {
      'tethering.usb.enabled': 'is-warning-wifi-tethering-message'
    }
  };

  var headerL10n = headerL10nMap[newSetting];
  var messageL10n =
    messageL10nMap[newSetting] && messageL10nMap[newSetting][oldSetting];

  var dialogElement = document.querySelector('.incompatible-settings-dialog');
  var dialogHead = document.querySelector('.is-warning-head');
  var dialogMessage = document.querySelector('.is-warning-message');
  var okBtn = document.querySelector('.incompatible-settings-ok-btn');
  var cancelBtn = document.querySelector('.incompatible-settings-cancel-btn');

  dialogHead.setAttribute('data-l10n-id', headerL10n);
  dialogMessage.setAttribute('data-l10n-id', messageL10n);

  // User has requested enable the feature so the old feature
  // must be disabled
  function onEnable(evt) {
    evt.preventDefault();
    var lock = navigator.mozSettings.createLock();
    var cset = {};

    cset[newSetting] = true;
    cset[oldSetting] = false;
    lock.set(cset);

    enableDialog(false);

    if (callback) {
      callback();
    }
  }

  function onCancel(evt) {
    evt.preventDefault();
    var lock = navigator.mozSettings.createLock();
    var cset = {};

    cset[newSetting] = false;
    cset[oldSetting] = true;
    lock.set(cset);

    enableDialog(false);
  }

  var enableDialog = function enableDialog(enabled) {
    if (enabled) {
      okBtn.addEventListener('click', onEnable);
      cancelBtn.addEventListener('click', onCancel);
      dialogElement.hidden = false;
    } else {
      okBtn.removeEventListener('click', onEnable);
      cancelBtn.removeEventListener('click', onCancel);
      dialogElement.hidden = true;
    }
  };

  enableDialog(true);
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
