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
    attachEvents();
  }

  function attachEvents() {
    _appStorage.addEventListener('change', handleEvent);
  }

  function detachEvents() {
    _appStorage.removeEventListener('change', handleEvent);
  }

  function handleEvent(evt) {
    debug('event handler: ' + evt.type + ' - ' + evt.reason);
    if (_callback)
      _callback();
  }

  function getSpaceInfo(callback) {
    var callbackFunc = callback ? callback : _callback;
    DeviceStorageHelper.getStat('apps', callbackFunc);
  }

  return {
    init: init,
    attachEvents: attachEvents,
    detachEvents: detachEvents,
    getSpaceInfo: getSpaceInfo
  };

})();


window.addEventListener('localized', function SettingsAppStorage(evt) {

  function updateInfo(usedSize, freeSize) {
    var _ = navigator.mozL10n.get;

    // calculate the percentage to show a space usage bar
    var totalSize = usedSize + freeSize;
    var usedPercentage = (totalSize == 0) ? 0 : (usedSize * 100 / totalSize);

    if (usedPercentage > 100)
      usedPercentage = 100;

    var spaceBar = document.getElementById('apps-space-bar');
    if (spaceBar && usedPercentage)
      spaceBar.value = usedPercentage;

    function formatSize(element, size, l10nId) {
      if (!element)
        return;

      if (!l10nId)
        l10nId = 'size-';

      // KB - 3 KB (nearest ones), MB, GB - 1.2 MB (nearest tenth)
      var fixedDigits = (size < 1024 * 1024) ? 0 : 1;
      var sizeInfo = FileSizeFormatter.getReadableFileSize(size, fixedDigits);

      element.textContent = _(l10nId + sizeInfo.unit,
                              {size: sizeInfo.size});
    }

    // Update the subtitle of device storage
    var element = document.getElementById('device-storage-desc');
    formatSize(element, freeSize, 'available-size-');

    // Update the storage details
    element = document.getElementById('apps-total-space').firstElementChild;
    formatSize(element, totalSize);

    element = document.getElementById('apps-used-space').firstElementChild;
    formatSize(element, usedSize);

    element = document.getElementById('apps-free-space').firstElementChild;
    formatSize(element, freeSize);
  }

  AppStorage.init(updateInfo);
  AppStorage.getSpaceInfo(updateInfo);

  document.addEventListener('mozvisibilitychange', function visibilityChange() {
    if (!document.mozHidden) {
      AppStorage.attachEvents();
      AppStorage.getSpaceInfo(updateInfo);
    } else {
      AppStorage.detachEvents();
    }
  });
});

