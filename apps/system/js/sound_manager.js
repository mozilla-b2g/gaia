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
  if ('mozSettings' in navigator) {
    var req = navigator.mozSettings.getLock().set({
      'audio.volume.master': currentVolume / 10
    });
  }

  SettingsListener.observe('audio.volume.master', 5, function(volume) {
    currentVolume = volume*10;
  });

  var activeTimeout = 0;
  function changeVolume(delta) {
    var volume = currentVolume + delta;
    currentVolume = volume = Math.max(0, Math.min(10, volume));

    var notification = document.getElementById('volume');
    var classes = notification.classList;
    if (volume == 0) {
      classes.add('vibration');
    } else {
      classes.remove('vibration');
    }

    var steps = notification.children;
    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (i < volume) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    }

    classes.add('visible');
    window.clearTimeout(activeTimeout);
    activeTimeout = window.setTimeout(function hideSound() {
      classes.remove('visible');
    }, 1500);

    if ('mozSettings' in navigator) {
      navigator.mozSettings.getLock().set({
        'audio.volume.master': currentVolume / 10
      });
    }
  }
})();
