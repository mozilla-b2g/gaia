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

  // XXX: This workaround could be removed once 
  // https://bugzilla.mozilla.org/show_bug.cgi?id=811222 landed
  function onCall() {
    var telephony = window.navigator.mozTelephony;
    if (!telephony)
      return false;

    return telephony.calls.some(function callIterator(call) {
        return (call.state == 'connected');
    });
  };

  // XXX: This workaround could be removed once 
  // https://bugzilla.mozilla.org/show_bug.cgi?id=811222 landed
  function onRing() {
    var telephony = window.navigator.mozTelephony;
    if (!telephony)
      return false;

    return telephony.calls.some(function callIterator(call) {
        return (call.state == 'incoming');
    });
  }
  
  // XXX: This workaround could be removed once 
  // https://bugzilla.mozilla.org/show_bug.cgi?id=811222 landed
  function onContentPlaying() {
    return false;
  }

  function onBTEarphoneConnected() {
    var bluetooth = navigator.mozBluetooth;
    if (!bluetooth)
      return false;

    // 0x111E is for querying earphone type.
    return navigator.mozBluetooth.isConnected(0x111E);
  };

  // Platform doesn't provide the maximum value of each channel
  // therefore, hard code here.
  var MAX_VOLUME = {
    'alarm': 15,
    'notification': 15,
    'telephony': 5,
    'content': 15,
    'bt_sco': 15
  };

  // Please refer https://wiki.mozilla.org/WebAPI/AudioChannels > Settings
  var currentVolume = {
    'alarm': 15,
    'notification': 15,
    'telephony': 5,
    'content': 15,
    'bt_sco': 15
  };
  var pendingRequestCount = 0;

  // We have three virtual states here:
  // OFF -> VIBRATION -> MUTE
  var muteState = 'OFF';

  for (var channel in currentVolume) {
    var setting = 'audio.volume.' + channel;
    SettingsListener.observe(setting, 5, function(volume) {
      if (pendingRequestCount)
        return;

      var max = MAX_VOLUME[channel];
      currentVolume[channel] = parseInt(Math.max(0, Math.min(max, volume)), 10);
    });
  }

  var activeTimeout = 0;

  function changeVolume(delta, channel) {
    // XXX: These status-checking functions could be removed when
    // Bug 811222 landed
    if (!channel) {
      if (onContentPlaying()) {
        channel = 'content';
      } else if (onRing()) {
        channel = 'notification';
      } else if (onCall()) {
        channel = 'telephony';
      } else {
        channel = 'notification';
      }
    }

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
    
    currentVolume[channel] = volume = Math.max(0, Math.min(MAX_VOLUME[channel], volume));

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

    var settingObject = {};
    settingObject['audio.volume.' + channel] = volume;
      
    req = SettingsListener.getSettingsLock().set(settingObject);  

    req.onsuccess = function onSuccess() {
      pendingRequestCount--;
    };

    req.onerror = function onError() {
      pendingRequestCount--;
    };
  }
})();
