/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var AppStorage = (function AppStorage() {
  var _appStorage = null;
  var _callback = null;
  var _debug = false;

  function debug(msg) {
    if (!_debug)
      return;

    console.log('+++AppStorage+++: ' + msg);
  }

  function init(callback) {
    _appStorage = navigator.getDeviceStorage('apps');
    _callback = callback;
    attachListeners();
  }

  function attachListeners() {
    _appStorage.addEventListener('change', handleEvent);
    window.addEventListener('localized', handleEvent);
  }

  function detachListeners() {
    _appStorage.removeEventListener('change', handleEvent);
    window.removeEventListener('localized', handleEvent);
  }

  function handleEvent(evt) {
    debug('event handler: ' + evt.type + ' - ' + evt.reason);
    if (_callback)
      getSpaceInfo(_callback);  // Bug834204_fix update issue
  }

  //XXX we really don't need this callback because nobody invoke this method
  //with a callback function.
  function getSpaceInfo(callback) {
    var callbackFunc = callback ? callback : _callback;
    DeviceStorageHelper.getStat('apps', callbackFunc);
  }

  return {
    init: init,
    attachListeners: attachListeners,
    detachListeners: detachListeners,
    update: getSpaceInfo
  };
})();

navigator.mozL10n.ready(function SettingsAppStorage() {
  function updateInfo(usedSize, freeSize) {
    var _ = navigator.mozL10n.get;

    // calculate the percentage to show a space usage bar
    var totalSize = usedSize + freeSize;
    var usedPercentage = (totalSize == 0) ? 0 : (usedSize * 100 / totalSize);

    if (usedPercentage > 100) {
      usedPercentage = 100;
    }

    var spaceBar = document.getElementById('apps-space-bar');
    if (spaceBar && usedPercentage) {
      spaceBar.value = usedPercentage;
    }

    function formatSize(element, size, l10nId) {
      if (!element)
        return;

      if (size === undefined || isNaN(size)) {
        element.textContent = '';
        return;
      }

      // KB - 3 KB (nearest ones), MB, GB - 1.2 MB (nearest tenth)
      var fixedDigits = (size < 1024 * 1024) ? 0 : 1;
      var sizeInfo = FileSizeFormatter.getReadableFileSize(size, fixedDigits);

      element.textContent = _(l10nId || 'storageSize', {
        size: sizeInfo.size,
        unit: _('byteUnit-' + sizeInfo.unit)
      });
    }

    // Update the subtitle of device storage
    var element = document.getElementById('device-storage-desc');
    formatSize(element, freeSize, 'availableSize');

    // Update the storage details
    element = document.getElementById('apps-total-space');
    formatSize(element, totalSize);

    element = document.getElementById('apps-used-space');
    formatSize(element, usedSize);

    element = document.getElementById('apps-free-space');
    formatSize(element, freeSize);
  }

  AppStorage.init(updateInfo);
  AppStorage.update();

  document.addEventListener('mozvisibilitychange', function visibilityChange() {
    if (!document.mozHidden) {
      AppStorage.attachListeners();
      AppStorage.update();
    } else {
      AppStorage.detachListeners();
    }
  });
});

