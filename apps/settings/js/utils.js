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
 * L10n helper
 */

var localize = navigator.mozL10n.localize;

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
      size: sizeDecimal.toString(),
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
  function getStat(type, callback) {
    var deviceStorage = navigator.getDeviceStorage(type);

    if (!deviceStorage) {
      console.error('Cannot get DeviceStorage for: ' + type);
      return;
    }
    deviceStorage.freeSpace().onsuccess = function(e) {
      var freeSpace = e.target.result;
      deviceStorage.usedSpace().onsuccess = function(e) {
        var usedSpace = e.target.result;
        callback(usedSpace, freeSpace, type);
      };
    };
  }

  function getFreeSpace(callback) {
    var deviceStorage = navigator.getDeviceStorage('sdcard');

    if (!deviceStorage) {
      console.error('Cannot get free space size in sdcard');
      return;
    }
    deviceStorage.freeSpace().onsuccess = function(e) {
      var freeSpace = e.target.result;
      callback(freeSpace);
    };
  }

  function showFormatedSize(element, l10nId, size) {
    if (size === undefined || isNaN(size)) {
      element.textContent = '';
      return;
    }

    // KB - 3 KB (nearest ones), MB, GB - 1.2 MB (nearest tenth)
    var fixedDigits = (size < 1024 * 1024) ? 0 : 1;
    var sizeInfo = FileSizeFormatter.getReadableFileSize(size, fixedDigits);

    var _ = navigator.mozL10n.get;
    element.textContent = _(l10nId, {
      size: sizeInfo.size,
      unit: _('byteUnit-' + sizeInfo.unit)
    });
  }

  return {
    getStat: getStat,
    getFreeSpace: getFreeSpace,
    showFormatedSize: showFormatedSize
  };
})();

/**
 * Connectivity accessors
 */
var getMobileConnection = function() {
  var navigator = window.navigator;

  // XXX: check bug-926169
  // this is used to keep all tests passing while introducing multi-sim APIs
  var mobileConnection = navigator.mozMobileConnection ||
    navigator.mozMobileConnections &&
      navigator.mozMobileConnections[0];

  if (mobileConnection && mobileConnection.data)
    return mobileConnection;
};

var getBluetooth = function() {
  return navigator.mozBluetooth;
};

var getNfc = function() {
  var navigator = window.navigator;
  if ('mozNfc' in navigator) {
    return navigator.mozNfc;
  }
  return null;
};

/**
 * The function returns an object of the supporting state of category of network
 * types. The categories are 'gsm' and 'cdma'.
 */
function getSupportedNetworkInfo(mobileConneciton, callback) {
  var types = [
    'wcdma/gsm',
    'gsm',
    'wcdma',
    'wcdma/gsm-auto',
    'cdma/evdo',
    'cdma',
    'evdo',
    'wcdma/gsm/cdma/evdo'
  ];
  if (!mobileConneciton)
    return;

  var _hwSupportedTypes = mobileConneciton.supportedNetworkTypes;

  var _result = {
    gsm: _hwSupportedTypes.indexOf('gsm') !== -1,
    cdma: _hwSupportedTypes.indexOf('cdma') !== -1,
    wcdma: _hwSupportedTypes.indexOf('wcdma') !== -1,
    evdo: _hwSupportedTypes.indexOf('evdo') !== -1,
    networkTypes: null
  };

  var _networkTypes = [];
  for (var i = 0; i < types.length; i++) {
    var type = types[i];
    var subtypes = type.split('/');
    var allSubTypesSupported = true;
    for (var j = 0; j < subtypes.length; j++) {
      allSubTypesSupported =
        allSubTypesSupported && _result[subtypes[j].split('-')[0]];
    }
    if (allSubTypesSupported)
      _networkTypes.push(type);
  }
  if (_networkTypes.length !== 0) {
    _result.networkTypes = _networkTypes;
  }
  callback(_result);
}

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

function getTruncated(oldName, options) {

  // options
  var maxLine = options.maxLine || 2;
  var node = options.node;
  var ellipsisIndex = options.ellipsisIndex || 3;
  var ellipsisCharacter = options.ellipsisCharacter || '...';

  if (node === null) {
    return oldName;
  }

  // used variables and functions
  function hitsNewline(oldHeight, newHeight) {
    return oldHeight !== newHeight;
  }

  var newName = '';
  var oldHeight;
  var newHeight;
  var baseHeight;
  var currentLine;
  var ellipsisAt;
  var hasNewEllipsisPoint = true;
  var nameBeforeEllipsis = [];
  var nameBeforeEllipsisString;
  var nameAfterEllipsis = oldName.slice(-ellipsisIndex);
  var realVisibility = node.style.visibility;
  var realWordBreak = node.style.wordBreak;

  /*
   * Hide UI, because we are manipulating DOM
   */
  node.style.visibility = 'hidden';

  /*
   * Force breaking on boundaries
   */
  node.style.wordBreak = 'break-all';

  /*
   * Get the base height to count the currentLine at first
   */
  node.textContent = '.';
  baseHeight = node.clientHeight;
  node.textContent = '';

  var needEllipsis = oldName.split('').some(function(character, index) {

    nameBeforeEllipsis.push(character);
    nameBeforeEllipsisString = nameBeforeEllipsis.join('');

    oldHeight = node.clientHeight;
    node.textContent = nameBeforeEllipsisString +
        ellipsisCharacter + nameAfterEllipsis;
    newHeight = node.clientHeight;

    /*
     * When index is 0, we have to update currentLine according to
     * the first assignment (it is possible that at first the currentLine
     * is not 0 if the width of node is too small)
     */
    if (index === 0) {
      currentLine = Math.floor(newHeight / baseHeight);
    }

    if (hitsNewline(oldHeight, newHeight) && index !== 0) {

      /*
       * The reason why we have to check twice is because there is a
       * situation that truncated string is overflowed but there is
       * still room for original string.
       *
       * In this way, we have to memorize the ellipsis index and
       * slice `nameBeforeEllipsis` to the index in the end.
       */
      var testHeight;
      node.textContent = nameBeforeEllipsisString;
      testHeight = node.clientHeight;

      if (hitsNewline(oldHeight, testHeight)) {

        /*
         * We have to make it true again to keep the ellipsisAt
         * up to date.
         */
        hasNewEllipsisPoint = true;
        currentLine += 1;
      } else {
        /*
         * This is the situation that we still have room, so we have
         * to keep the ellipsisAt value for later use.
         */
        if (hasNewEllipsisPoint) {
          ellipsisAt = index;
          hasNewEllipsisPoint = false;
        }
      }
    }

    if (currentLine > maxLine) {
      if (index === 0) {

        /*
         * It means that at first, the whole string is already in
         * an overflowed situation, you have to avoid this situation.
         * And we will bypass oldName back to you.
         *
         * There are some options for you :
         *
         *   1. Check options.ellipsisCharacter
         *   2. Check options.maxLine
         *   3. Check node's width (maybe too narrow)
         */
        console.log(
          'Your string is in a overflowed situation, ' +
          'please check your options');
      }

      /*
       * Remove the last character, because it causes the overflow
       */
      nameBeforeEllipsis.pop();
      node.textContent = '';
      return true;
    }
  });

  // restore UI
  node.style.visibility = realVisibility;
  node.style.wordBreak = realWordBreak;

  if (!needEllipsis) {
    newName = oldName;
  } else {
    newName += nameBeforeEllipsis.join('').slice(0, ellipsisAt);
    newName += ellipsisCharacter;
    newName += nameAfterEllipsis;
  }

  return newName;
}
