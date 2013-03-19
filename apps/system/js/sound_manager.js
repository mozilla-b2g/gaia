/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  window.addEventListener('volumeup', function() {
    if (ScreenManager.screenEnabled || currentChannel !== 'none') {
      if (onBTEarphoneConnected() && onCall()) {
        changeVolume(1, 'bt_sco');
      } else {
        changeVolume(1);
      }
    }
  });
  window.addEventListener('volumedown', function() {
    if (ScreenManager.screenEnabled || currentChannel !== 'none') {
      if (onBTEarphoneConnected() && onCall()) {
        changeVolume(-1, 'bt_sco');
      } else {
        changeVolume(-1);
      }
    }
  });

  // Store the current active channel;
  // change with 'audio-channel-changed' mozChromeEvent
  var currentChannel = 'none';

  var vibrationEnabled = true;

  // This event is generated in shell.js in response to bluetooth headset.
  // Bluetooth headset always assign audio volume to a specific value when
  // pressing its volume-up/volume-down buttons.
  window.addEventListener('mozChromeEvent', function(e) {
    var type = e.detail.type;
    if (type == 'bluetooth-volumeset') {
      changeVolume(e.detail.value - currentVolume['bt_sco'], 'bt_sco');
    } else if (type == 'audio-channel-changed') {
      currentChannel = e.detail.channel;
    }
  });

  function onCall() {
    if (currentChannel == 'telephony')
      return true;

    // XXX: This work should be removed
    // once we could get telephony channel change event
    // https://bugzilla.mozilla.org/show_bug.cgi?id=819858
    var telephony = window.navigator.mozTelephony;
    if (!telephony)
      return false;

    return telephony.calls.some(function callIterator(call) {
        return (call.state == 'connected');
    });
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
    (function(channel) {
      var setting = 'audio.volume.' + channel;
      SettingsListener.observe(setting, 5, function onSettingsChange(volume) {
        if (pendingRequestCount)
          return;

        var max = MAX_VOLUME[channel];
        currentVolume[channel] =
            parseInt(Math.max(0, Math.min(max, volume)), 10);
      });
    })(channel);
  }

  SettingsListener.observe('vibration.enabled', true, function(vibration) {
    if (pendingRequestCount)
      return;

    vibrationEnabled = vibration;
  });

  var activeTimeout = 0;

  // When hardware volume key is pressed, we need to decide which channel we
  // should toggle.
  // This method returns the string for setting key 'audio.volume.*' represents
  // that.
  // Note: this string does not always equal to currentChannel since some
  // different channels are grouped together to listen to the same setting.
  function getChannel() {
    if (onCall())
      return 'telephony';

    switch (currentChannel) {
      case 'normal':
      case 'content':
        return 'content';
      case 'telephony':
        return 'telephony';
      case 'alarm':
        return 'alarm';
      case 'notification':
      case 'ringer':
      default:
        return 'notification';
    }
  }

  function getVolumeState(currentVolume, delta, channel) {
    if (channel == 'notification') {
      if (currentVolume + delta <= 0) {
        if (currentVolume == 0 && vibrationEnabled) {
          vibrationEnabled = false;
        } else if (currentVolume > 0 && !vibrationEnabled) {
          vibrationEnabled = true;
        }
        return 'MUTE';
      } else {
        return 'OFF';
      }
    } else {
      if (currentVolume + delta <= 0) {
        return 'MUTE';
      } else {
        return 'OFF';
      }
    }
  }

  function changeVolume(delta, channel) {
    channel = channel ? channel : getChannel();

    muteState = getVolumeState(currentVolume[channel], delta, channel);

    var volume = currentVolume[channel] + delta;

    currentVolume[channel] = volume =
      Math.max(0, Math.min(MAX_VOLUME[channel], volume));

    var overlay = document.getElementById('system-overlay');
    var notification = document.getElementById('volume');
    var overlayClasses = overlay.classList;
    var classes = notification.classList;

    switch (muteState) {
      case 'OFF':
        classes.remove('mute');
        if (vibrationEnabled) {
          classes.add('vibration');
        } else {
          classes.remove('vibration');
        }
        break;
      case 'MUTE':
        classes.add('mute');
        if (channel == 'notification') {
          if (vibrationEnabled) {
            classes.add('vibration');
            SettingsListener.getSettingsLock().set({
                'vibration.enabled': true
            });
          } else {
            classes.remove('vibration');
            SettingsListener.getSettingsLock().set({
                'vibration.enabled': false
            });
          }
        }
        break;
    }

    var steps =
      Array.prototype.slice.call(notification.querySelectorAll('div'), 0);

    var maxVolumeStep = (channel == 'telephony' || channel == 'bt_sco') ?
      volume + 1 : volume;

    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (i < maxVolumeStep) {
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

