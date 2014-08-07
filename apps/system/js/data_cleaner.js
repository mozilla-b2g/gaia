'use strict';

(function(exports) {
  // Use a setting in order to be "called" by settings app
  navigator.mozSettings.addObserver(
    'clear.remote-windows.data',
    function clearRemoteWindowsData(setting) {
      var shouldClear = setting.settingValue;
      if (!shouldClear) {
        return;
      }

      // Delete all storage and cookies from our content processes
      var request = navigator.mozApps.getSelf();
      request.onsuccess = function() {
        request.result.clearBrowserData();
      };

      // Reset the setting value to false
      var lock = navigator.mozSettings.createLock();
      lock.set({'clear.remote-windows.data': false});
    });

  /* === XXX Bug 900512 === */
  // On some devices touching the hardware home button triggers
  // touch events at position 0,0. In order to make sure those does
  // not trigger unexpected behaviors those are captured here.
  function cancelHomeTouchstart(e) {
    if (e.touches[0].pageX === 0 && e.touches[0].pageY === 0) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  function cancelHomeTouchend(e) {
    if (e.changedTouches[0].pageX === 0 && e.changedTouches[0].pageY === 0) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  function cancelHomeClick(e) {
    if (e.pageX === 0 && e.pageY === 0) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  window.addEventListener('touchstart', cancelHomeTouchstart, true);
  window.addEventListener('touchend', cancelHomeTouchend, true);
  window.addEventListener('mousedown', cancelHomeClick, true);
  window.addEventListener('mouseup', cancelHomeClick, true);
}(window));
