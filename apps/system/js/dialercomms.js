'use strict';

(function(window) {
  window.addEventListener('sleep', stopRingtone);
  window.addEventListener('volumedown', stopRingtone);

  function stopRingtone() {
    var port = IACHandler.getPort('dialercomms');
    if (!port) {
      return;
    }

    port.postMessage('stop_ringtone');
  }
})(this);
