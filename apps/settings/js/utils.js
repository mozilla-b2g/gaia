/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Move settings to foreground
 */

function reopenSettings() {
  navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
    var app = evt.target.result;
    app.launch('settings');
  };
}

/**
 * Open a link with a web activity
 */

function openLink(url) {
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
 * These so-called "dialog boxes" are just standard Settings panels (<section
 * role="region" />) with reset/submit buttons: these buttons both return to the
 * previous panel when clicked, and each button has its own (optional) callback.
 */

function openDialog(dialogID, onSubmit, onReset) {
  if ('#' + dialogID == Settings.currentPanel)
    return;

  var origin = Settings.currentPanel;

  // Load dialog contents and show it.
  Settings.currentPanel = dialogID;

  var dialog = document.getElementById(dialogID);
  var submit = dialog.querySelector('[type=submit]');
  if (submit) {
    submit.onclick = function onsubmit() {
      if (typeof onSubmit === 'function')
        (onSubmit.bind(dialog))();
      Settings.currentPanel = origin; // hide dialog box
    };
  }

  var reset = dialog.querySelector('[type=reset]');
  if (reset) {
    reset.onclick = function onreset() {
      if (typeof onReset === 'function')
        (onReset.bind(dialog))();
      Settings.currentPanel = origin; // hide dialog box
    };
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

  var dialogElement = document.querySelector('.incompatible-settings-dialog'),
    dialogHead = document.querySelector('.is-warning-head'),
    dialogMessage = document.querySelector('.is-warning-message'),
    okBtn = document.querySelector('.incompatible-settings-ok-btn'),
    cancelBtn = document.querySelector('.incompatible-settings-cancel-btn'),
    mozL10n = navigator.mozL10n;

  dialogHead.setAttribute('data-l10n-id', headerL10n);
  dialogMessage.setAttribute('data-l10n-id', messageL10n);

  // User has requested enable the feature so the old feature
  // must be disabled
  function onEnable() {
    var lock = Settings.mozSettings.createLock();
    var cset = {};

    cset[newSetting] = true;
    cset[oldSetting] = false;
    lock.set(cset);

    enableDialog(false);

    if (callback) {
      callback();
    }
  }

  function onCancel() {
    var lock = Settings.mozSettings.createLock();
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
 * JSON loader
 */

function loadJSON(href, callback) {
  if (!callback)
    return;
  var xhr = new XMLHttpRequest();
  xhr.onerror = function() {
    console.error('Failed to fetch file: ' + href, xhr.statusText);
  };
  xhr.onload = function() {
    callback(xhr.response);
  };
  xhr.open('GET', href, true); // async
  xhr.responseType = 'json';
  xhr.send();
}

/**
 * Helper class for formatting file size strings
 * required by *_storage.js
 */

var FileSizeFormatter = (function FileSizeFormatter(fixed) {
  function getReadableFileSize(size, digits) { // in: size in Bytes
    if (size === undefined)
      return {};

    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = 0;
    while (size >= 1024) {
      size /= 1024;
      ++i;
    }

    var sizeString = size.toFixed(digits || 0);
    var sizeDecimal = parseFloat(sizeString);

    return {
      size: sizeDecimal,
      unit: units[i]
    };
  }

  return { getReadableFileSize: getReadableFileSize };
})();

/**
 * Helper class for getting available/used storage
 * required by *_storage.js
 */

var DeviceStorageHelper = (function DeviceStorageHelper() {
  function showFormatedSize(element, l10nId, size) {
    if (size === undefined || isNaN(size)) {
      element.textContent = '';
      return;
    }

    // KB - 3 KB (nearest ones), MB, GB - 1.2 MB (nearest tenth)
    var fixedDigits = (size < 1024 * 1024) ? 0 : 1;
    var sizeInfo = FileSizeFormatter.getReadableFileSize(size, fixedDigits);

    var _ = navigator.mozL10n.get;
    navigator.mozL10n.setAttributes(element,
                                    l10nId,
                                    {
                                      size: sizeInfo.size,
                                      unit: _('byteUnit-' + sizeInfo.unit)
                                    });
  }

  return {
    showFormatedSize: showFormatedSize
  };
})();

/**
 * Connectivity accessors
 */
var getMobileConnection = function() {
  var mobileConnection = navigator.mozMobileConnections &&
      navigator.mozMobileConnections[0];

  if (mobileConnection && mobileConnection.data) {
    return mobileConnection;
  }
  return null;
};

var getBluetooth = function() {
  return navigator.mozBluetooth;
};

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
})(this);

function isIP(address) {
  return /^\d+\.\d+\.\d+\.\d+$/.test(address);
}

// Remove additional 0 in front of IP digits.
// Notice that this is not following standard dot-decimal notation, just for
// possible error tolarance.
// (Values starting with 0 stand for octal representation by standard)
function sanitizeAddress(input) {
  if (isIP(input)) {
    return input.replace(/0*(\d+)/g, '$1');
  } else {
    return input;
  }
}

/**
 * Retrieve current ICC by a given index. If no index is provided, it will
 * use the index provided by `DsdsSettings.getIccCardIndexForCallSettings`,
 * which is the default. Unless there are very specific reasons to provide an
 * index, this function should always be invoked with no parameters in order to
 * use the currently selected ICC index.
 *
 * @param {Number} index index of the mobile connection to get the ICC from
 * @return {object}
 */
function getIccByIndex(index) {
  if (index === undefined) {
    index = DsdsSettings.getIccCardIndexForCallSettings();
  }
  var iccObj;

  if (navigator.mozMobileConnections[index]) {
    var iccId = navigator.mozMobileConnections[index].iccId;
    if (iccId) {
      iccObj = navigator.mozIccManager.getIccById(iccId);
    }
  }

  return iccObj;
}
