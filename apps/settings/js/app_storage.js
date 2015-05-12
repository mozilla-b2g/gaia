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

  function getSpaceInfo() {
    DeviceStorageHelper.getStat('apps', _callback);
  }

  function updatePanelInfo (e) {
    if(e.detail.current !== '#applicationStorage') {
      return;
    }
    getSpaceInfo();
  }

  function attachListeners() {
    _appStorage.addEventListener('change', getSpaceInfo);
    window.addEventListener('localized', getSpaceInfo);
    window.addEventListener('panelready', updatePanelInfo);
  }

  function detachListeners() {
    _appStorage.removeEventListener('change', getSpaceInfo);
    window.removeEventListener('localized', getSpaceInfo);
    window.removeEventListener('panelready', updatePanelInfo);
  }


  return {
    init: init,
    attachListeners: attachListeners,
    detachListeners: detachListeners,
    update: getSpaceInfo
  };
})();

navigator.mozL10n.once(function SettingsAppStorage() {
  function updateInfo(usedSize, freeSize) {
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

    // Update the storage details
    var element = document.getElementById('apps-total-space');
    DeviceStorageHelper.showFormatedSize(element, 'storageSize', totalSize);

    element = document.getElementById('apps-used-space');
    DeviceStorageHelper.showFormatedSize(element, 'storageSize', usedSize);

    element = document.getElementById('apps-free-space');
    DeviceStorageHelper.showFormatedSize(element, 'storageSize', freeSize);
  }

  AppStorage.init(updateInfo);
  AppStorage.update();

  document.addEventListener('visibilitychange', function visibilityChange() {
    if (!document.hidden) {
      AppStorage.attachListeners();
      AppStorage.update();
    } else {
      AppStorage.detachListeners();
    }
  });
});

