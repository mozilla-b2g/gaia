/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  window.addEventListener('volumeup', function() {
    if (onBTEarphoneConnected() && onCall()) {
      changeVolume(1, 'bt_sco');
    } else {
      changeVolume(1);
    }
  });
  window.addEventListener('volumedown', function() {
    if (onBTEarphoneConnected() && onCall()) {
      changeVolume(-1, 'bt_sco');
    } else {
      changeVolume(-1);
    }
  });

  // This event is generated in shell.js in response to bluetooth headset.
  // Bluetooth headset always assign audio volume to a specific value when
  // pressing its volume-up/volume-down buttons.
  window.addEventListener('mozChromeEvent', function(e) {
    var type = e.detail.type;
    if (type == 'bluetooth-volumeset') {
      changeVolume(e.detail.value - currentVolume['bt_sco'], 'bt_sco');
    }
  });

  function onCall() {
    var telephony = window.navigator.mozTelephony;
    if (!telephony)
      return false;

    return telephony.calls.some(function callIterator(call) {
        return (call.state == 'connected');
    });
  };

  function onBTEarphoneConnected() {
    var bluetooth = navigator.mozBluetooth;
    if (!bluetooth)
      return false;

    // 0x111E is for querying earphone type.
    return navigator.mozBluetooth.isConnected(0x111E);
  };

  var currentVolume = {
    'system': 10,
    'alarm': 10,
    'notification': 10,
    'voice_call': 10,
    'music': 10,
    'bt_sco': 15
  };
  var pendingRequestCount = 0;

  // We have three virtual states here:
  // OFF -> VIBRATION -> MUTE
  var muteState = 'OFF';

  SettingsListener.observe('audio.volume.system', 5, function(volume) {
    if (pendingRequestCount)
      return;

    currentVolume['system'] = volume;
  });

  SettingsListener.observe('audio.volume.music', 5, function(volume) {
    if (pendingRequestCount)
      return;

    currentVolume['music'] = volume;
  });

  SettingsListener.observe('audio.volume.voice_call', 5, function(volume) {
    if (pendingRequestCount)
      return;

    currentVolume['voice_call'] = volume;
  });

  SettingsListener.observe('audio.volume.notification', 5, function(volume) {
    if (pendingRequestCount)
      return;

    currentVolume['notification'] = volume;
  });

  var activeTimeout = 0;
  function changeVolume(delta, channel) {
    if (!channel)
      channel = 'system';

    if (currentVolume[channel] == 0 ||
        ((currentVolume[channel] + delta) <= 0)) {
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

    var volume = currentVolume[channel] + delta;
    if (channel != 'bt_sco') {
      currentVolume[channel] = volume = Math.max(0, Math.min(10, volume));
    } else {
      currentVolume[channel] = volume = Math.max(0, Math.min(15, volume));
    }

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

    pendingRequestCount++;
    var req;

    notification.dataset.channel = channel;

    if (channel == 'bt_sco') {
      req = SettingsListener.getSettingsLock().set({
        'audio.volume.bt_sco': currentVolume[channel]
      });
    } else {
      req = SettingsListener.getSettingsLock().set({
        'audio.volume.system': currentVolume[channel]
      });
      // XXX: https://bugzilla.mozilla.org/show_bug.cgi?id=810780
      // Before this fix is landed, set to all kind of volume at the same time
      // to avoid some regression.
      // Note: alarm is excluded here.
      SettingsListener.getSettingsLock().set({
        'audio.volume.music': currentVolume[channel]
      });
      SettingsListener.getSettingsLock().set({
        'audio.volume.voice_call': currentVolume[channel]
      });
      SettingsListener.getSettingsLock().set({
        'audio.volume.notification': currentVolume[channel]
      });
    }

    req.onsuccess = function onSuccess() {
      pendingRequestCount--;
    };

    req.onerror = function onError() {
      pendingRequestCount--;
    };
  }
})();
