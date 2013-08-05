/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  window.addEventListener('volumeup', function() {
    if (ScreenManager.screenEnabled || currentChannel !== 'none') {
      if (Bluetooth.connected && onCall()) {
        changeVolume(1, 'bt_sco');
      } else if (isHeadsetConnected) {
        headsetVolumeup();
      } else {
        changeVolume(1);
      }
    }
  });
  window.addEventListener('volumedown', function() {
    if (ScreenManager.screenEnabled || currentChannel !== 'none') {
      if (Bluetooth.connected && onCall()) {
        changeVolume(-1, 'bt_sco');
      } else {
        changeVolume(-1);
        ceAccumulator();
      }
    }
  });

  /**
   * The mute event is dispatched from sleep menu.
   * But if we have a mute hardware button or virtual button,
   * we could make the button handler to fire this event, too.
   */
  window.addEventListener('mute', function() {
    // Turn off vibration for really silence.
    SettingsListener.getSettingsLock().set({
      'vibration.enabled': false
    });
    enterSilentMode('notification');
  });

  /**
   * The unmute event is dispatched from sleep menu.
   * But if we have a mute hardware button or virtual button,
   * we could make the button handler to fire this event, too.
   */
  window.addEventListener('unmute', function() {
    // Turn on vibration.
    SettingsListener.getSettingsLock().set({
      'vibration.enabled': true
    });
    leaveSilentMode('notification');
    leaveSilentMode('content');
  });

  // Store the current active channel;
  // change with 'audio-channel-changed' mozChromeEvent
  var currentChannel = 'none';

  var vibrationEnabled = true;

  // Cache the volume when entering silent mode.
  // Currently only two channel would be used for mute.
  var cachedVolume = {
    'content': -1,
    'notification': -1
  };

  var cachedChannels = ['content', 'notification'];

  var isHeadsetConnected = false;

  var TIME_TWENTY_HOURS = 72000000;

  var TIME_TEST_HOURS = 90000;// for test

  var TIME_ONE_MINUTE = 60000;

  var CEAccumulatorID = null;

  var CEWarningVol = 11;

  var CEAccumulatorTime = 0;

  var CETimestamp = 0;

  var CACHE_CETIMES = 'CE_ACCTIME';

  // This event is generated in shell.js in response to bluetooth headset.
  // Bluetooth headset always assign audio volume to a specific value when
  // pressing its volume-up/volume-down buttons.
  window.addEventListener('mozChromeEvent', function(e) {
    var type = e.detail.type;
    if (type == 'bluetooth-volumeset') {
      changeVolume(e.detail.value - currentVolume['bt_sco'], 'bt_sco');
    } else if (type == 'audio-channel-changed') {
      currentChannel = e.detail.channel;
      ceAccumulator();
    } else if (type == 'headphones-status-changed') {
      isHeadsetConnected = (e.detail.state != 'off');
      ceAccumulator();
    }
  });

  window.addEventListener('localized', function(e) {

    SettingsListener.observe('audio.volume.cemaxvol', 11, function(volume) {
      CEWarningVol = volume;
    });

    window.asyncStorage.getItem(CACHE_CETIMES,
      function onGettingContentVolume(value) {
        if (!value) {
          return;
        } else {
          CEAccumulatorTime = value;
        }
      });
  });

  window.addEventListener('unload', stopAccumulator, false);

  function ceAccumulator() {
    if (isHeadsetConnected && getChannel() == 'content' &&
      currentVolume[currentChannel] >= CEWarningVol) {
      if (CEAccumulatorTime == 0) {
        resetToCEMaxVolume();
      } else {
        startAccumulator();
      }
    } else {
      stopAccumulator();
    }
  }

  function headsetVolumeup() {
    if ((currentVolume[getChannel()] + 1) >= CEWarningVol &&
        getChannel() == 'content') {
      if (CEAccumulatorTime == 0) {
        var okfn = function() {
          changeVolume(1);
          startAccumulator();
        };
        resetToCEMaxVolume(okfn);
      } else {
        startAccumulator();
        changeVolume(1);
      }
    } else {
      changeVolume(1);
    }
  }

  function showCEWarningDialog(okfn) {
    // Show dialog.
    var agreement = false;
    var _ = navigator.mozL10n.get;

    var ceTitle = {
      'icon': '/style/sound_manager/images/icon_Volumewarning.png',
      'title': _('ceWarningtitle')
    };
    var ceMsg = _('ceWarningcontent');

    var cancel = {
      'title': _('ok')
    };

    if (okfn instanceof Function) {
      cancel.callback = function onCancel() {
        okfn();
        CustomDialog.hide();
      };
    } else {
      cancel.callback = function onCancel() {
        startAccumulator();
        CustomDialog.hide();
      };
    }

    CustomDialog.show(ceTitle, ceMsg, cancel);
  }

  function startAccumulator() {
    if (CEAccumulatorID == null) {
      if (CEAccumulatorTime == 0) {
        CEAccumulatorTime = 1;
        CETimestamp = parseInt(new Date().getTime(), 10);
      }
      CEAccumulatorID = window.setInterval(function() {
        CEAccumulatorTime += TIME_ONE_MINUTE;
        CETimestamp = parseInt(new Date().getTime(), 10);
        if (CEAccumulatorTime > TIME_TWENTY_HOURS) {
          CEAccumulatorTime = 0; // reset time
          CETimestamp = 0; // reset timestamp
          stopAccumulator();
          resetToCEMaxVolume();
        }
      }, TIME_ONE_MINUTE);
    }
  }

  function stopAccumulator() {
    if (CEAccumulatorID != null) {
      window.clearInterval(CEAccumulatorID);
      CEAccumulatorID = null;
      if (CETimestamp != 0) {
         CEAccumulatorTime = CEAccumulatorTime +
         (parseInt(new Date().getTime(), 10) - CETimestamp);
      }
      window.asyncStorage.setItem(CACHE_CETIMES, CEAccumulatorTime);
    }
  }

  function resetToCEMaxVolume(callback) {
    pendingRequestCount++;
    var req = SettingsListener.getSettingsLock().set({
      'audio.volume.content': CEWarningVol - 1
    });

    req.onsuccess = function onSuccess() {
      pendingRequestCount--;
      showCEWarningDialog(callback);
    };

    req.onerror = function onError() {
      pendingRequestCount--;
      showCEWarningDialog(callback);
    };
  }

  // True if the homescreen or the lockscreen are visible.
  var homescreenVisible = true;

  window.addEventListener('appopen', function() {
    homescreenVisible = false;
  });
  window.addEventListener('ftudone', function() {
    // FTU closing implies we're going to homescreen.
    homescreenVisible = true;
  });
  window.addEventListener('home', function() {
    homescreenVisible = true;
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

  /*
    Bind setting handlers
    @param {Function} callback Callback being called after each setting handler
                               has been invoked once.
   */
  (function bindVolumeSettingsHandlers(callback) {
    var callsMade = 0;
    var callbacksReceived = 0;

    for (var channel in currentVolume) {
      callsMade++;

      (function(channel) {
        var setting = 'audio.volume.' + channel;
        SettingsListener.observe(setting, 5, function onSettingsChange(volume) {
          // Initial loaded setting should always pass through (one per channel)
          if (pendingRequestCount)
            return;

          var max = MAX_VOLUME[channel];
          currentVolume[channel] =
            parseInt(Math.max(0, Math.min(max, volume)), 10);

          if (channel === 'content' && inited && volume > 0) {
            leaveSilentMode('content',
                            /* skip volume restore */ true);
          } else if (channel === 'notification' && volume > 0) {
            leaveSilentMode('notification',
                            /* skip volume restore */ true);
          } else if (channel === 'notification' && volume == 0) {
            // Enter silent mode when notification volume is 0
            // no matter who sets this value.
            enterSilentMode('notification');
          }

          if (!inited && ++callbacksReceived === callsMade)
            callback();
        });
      })(channel);
    }
  })(fetchCachedVolume);

  SettingsListener.observe('vibration.enabled', true, function(vibration) {
    if (pendingRequestCount)
      return;

    vibrationEnabled = vibration;
  });

  // Fetch stored volume if it exists.
  // We should make sure this happens after settingsDB callback
  // after booting.

  var inited = false;

  function fetchCachedVolume() {
    if (inited)
      return;

    inited = true;
    pendingRequestCount += cachedChannels.length;
    cachedChannels.forEach(
      function iterator(channel) {
        window.asyncStorage.getItem('content.volume',
          function onGettingCachedVolume(value) {
            if (!value) {
              pendingRequestCount--;
              return;
            }

            cachedVolume[channel] = value;
            pendingRequestCount--;
          });
      });
  }

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
          return 'notification';
      default:
        return homescreenVisible || LockScreen.locked ||
          FtuLauncher.isFtuRunning() ? 'notification' : 'content';
    }
  }

  function calculateVolume(currentVolume, delta, channel) {
    var volume = currentVolume;
    if (channel == 'notification') {
      if (volume == 0 && !vibrationEnabled) {
        // This is for voluming up from Silent to Vibrate.
        // Let's take -1 as the silent state and
        // 0 as the vibrate state for easier calculation here.
        volume = -1;
      }
      volume += delta;
    } else {
      volume += delta;
    }
    return volume;
  }

  function getVibrationAndMuteState(currentVolume, delta, channel) {
    if (channel == 'notification') {
      var state;
      var volume = currentVolume;
      if (volume == 0 && !vibrationEnabled) {
        // This is for voluming up from Silent to Vibrate.
        // Let's take -1 as the silent state and
        // 0 as the vibrate state for easier calculation here.
        volume = -1;
      }
      volume += delta;

      if (volume < 0) {
        state = 'MUTE';
        vibrationEnabled = false;
      } else if (volume == 0) {
        state = 'MUTE';
        vibrationEnabled = true;
      } else {
        state = 'OFF';
        vibrationEnabled = false;
      }
      return state;
    } else {
      if (currentVolume + delta <= 0) {
        return 'MUTE';
      } else {
        return 'OFF';
      }
    }
  }

  function enterSilentMode(channel) {
    if (!channel)
      channel = 'content';

    // Don't need to enter silent mode more than once.
    if (currentVolume[channel] == 0)
      return;

    var isCachedAlready =
      (cachedVolume[channel] == currentVolume[channel]);
    cachedVolume[channel] = currentVolume[channel];
    pendingRequestCount++;
    var settingObject = {};
    settingObject['audio.volume.' + channel] = 0;
    var req = SettingsListener.getSettingsLock().set(settingObject);

    req.onsuccess = function onSuccess() {
      pendingRequestCount--;

      // Write to async storage only happens when
      // we haven't stored it before.
      // If the user presses the volume rockers repeatedly down and up,
      // between silent-mode/vibration mode/normal mode,
      // we won't repeatedly write the same value to storage.
      if (!isCachedAlready)
        window.asyncStorage.setItem(channel + '.volume', cachedVolume[channel]);
    };

    req.onerror = function onError() {
      pendingRequestCount--;
    };
  }

  /**
   * Leaving silent mode.
   * @param  {String} channel Specify the channel name
   *                          which is going to enter silent mode.
   * @param  {Boolean} skip_restore Specify to skip the volume restore or not.
   */
  function leaveSilentMode(channel, skip_restore) {
    if (!channel)
      channel = 'content';

    // We're leaving silent mode.
    if (!skip_restore &&
        (cachedVolume[channel] > 0 || currentVolume[channel] == 0)) {
      var req;
      var settingObject = {};

      // At least rollback to 1,
      // otherwise we don't really leave silent mode.
      settingObject['audio.volume.' + channel] =
        (cachedVolume[channel] > 0) ? cachedVolume[channel] : 1;

      pendingRequestCount++;
      req = SettingsListener.getSettingsLock().set(settingObject);

      req.onsuccess = function onSuccess() {
        pendingRequestCount--;
      };

      req.onerror = function onError() {
        pendingRequestCount--;
      };
    }

    cachedVolume[channel] = -1;
  }

  function changeVolume(delta, channel) {
    channel = channel ? channel : getChannel();

    var vibrationEnabledOld = vibrationEnabled;
    var volume = calculateVolume(currentVolume[channel], delta, channel);
    muteState =
      getVibrationAndMuteState(currentVolume[channel], delta, channel);

    // Silent mode entry point
    if (volume <= 0 && delta < 0 && channel == 'notification') {
      enterSilentMode('content');
    } else if (volume == 1 && delta > 0 && channel == 'notification' &&
                cachedVolume['content'] >= 0) {
      // Now since the active channel is notification channel,
      // we're leaving content silent mode and the same time restoring it.
      leaveSilentMode('content');

      // In the notification silent mode, volume rocker priority is higher
      // than stored notification volume value so we skip the restore.
      leaveSilentMode('notification', /*skip volume restore*/ true);
    }

    currentVolume[channel] = volume =
      Math.max(0, Math.min(MAX_VOLUME[channel], volume));

    var overlay = document.getElementById('system-overlay');
    var notification = document.getElementById('volume');
    var overlayClasses = overlay.classList;
    var classes = notification.classList;

    switch (muteState) {
      case 'OFF':
        classes.remove('mute');
        break;
      case 'MUTE':
        classes.add('mute');
        break;
    }

    if (vibrationEnabled) {
      classes.add('vibration');
    } else {
      classes.remove('vibration');
    }

    if (vibrationEnabledOld != vibrationEnabled) {
      SettingsListener.getSettingsLock().set({
        'vibration.enabled': vibrationEnabled
      });
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

