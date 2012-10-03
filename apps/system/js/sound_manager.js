/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  window.addEventListener('volumeup', function() {
    changeVolume(1);
  });
  window.addEventListener('volumedown', function() {
    changeVolume(-1);
  });

  var currentVolume = 5;

  // We have three virtual states here:
  // OFF -> VIBRATION -> MUTE
  var muteState = 'OFF';

  SettingsListener.observe('audio.volume.master', 5, function(volume) {
    currentVolume = volume * 10;
  });

  var activeTimeout = 0;
  function changeVolume(delta) {
    if (currentVolume == 0 ||
        (currentVolume == 1 && delta < 0)) {
      if (delta < 0) {
        if (muteState == 'OFF') {
          muteState = 'VIBRATION';
        } else {
          muteState = 'MUTE';
        }
      } else {
        if (muteState == 'MUTE') {
          delta = 0;
          muteState = 'VIBRATION';
        } else {
          muteState = 'OFF';
        }
      }
    }

    var volume = currentVolume + delta;

    currentVolume = volume = Math.max(0, Math.min(10, volume));

    var overlay = document.getElementById('system-overlay');
    var notification = document.getElementById('volume');
    var overlayClasses = overlay.classList;
    var classes = notification.classList;

    switch (muteState) {
      case 'OFF':
        classes.remove('vibration');
        classes.remove('mute');
        break;
      case 'VIBRATION':
        classes.add('vibration');
        classes.add('mute');
        SettingsListener.getSettingsLock().set({
          'vibration.enabled': true
        });
        break;
      case 'MUTE':
        classes.remove('vibration');
        classes.add('mute');
        SettingsListener.getSettingsLock().set({
          'vibration.enabled': false
        });
        break;
    }

    var steps =
      Array.prototype.slice.call(notification.querySelectorAll('div'), 0);

    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (i < volume) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    }

    overlayClasses.add('volume');
    classes.add('visible');
    window.clearTimeout(activeTimeout);
    activeTimeout = window.setTimeout(function hideSound() {
      overlayClasses.remove('volume');
      classes.remove('visible');
    }, 1500);

    if (!window.navigator.mozSettings)
      return;

    SettingsListener.getSettingsLock().set({
      'audio.volume.master': currentVolume / 10
    });
  }
})();
