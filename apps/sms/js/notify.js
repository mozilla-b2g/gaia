/*global SettingsURL */

(function(exports) {
  'use strict';

  function entry(key, value) {
    settings[key] = urls[key] ? urls[key].set(value) : value;
  }

  var mozSettings = navigator.mozSettings;
  var settings = {};
  var urls = {
    'notification.ringtone': new SettingsURL()
  };

  [
    'audio.volume.notification',
    'notification.ringtone',
    'vibration.enabled'
  ].forEach(function(key) {
    if (mozSettings) {
      var request = mozSettings.createLock().get(key);
      request.onsuccess = function() {
        entry(key, request.result[key]);
      };

      mozSettings.addObserver(key, function(event) {
        entry(key, event.settingValue);
      });
    }
  });

  function ringtone(ringtoneFile) {
    var ringtonePlayer = new Audio();
    ringtonePlayer.src = ringtoneFile;
    ringtonePlayer.mozAudioChannelType = 'notification';
    ringtonePlayer.play();
    window.setTimeout(function smsRingtoneEnder() {
      ringtonePlayer.pause();
      ringtonePlayer.src = '';
    }, 2000);
  }

  function vibrate() {
    // vibration only works when App is in the foreground
    if (document.hidden) {
      window.addEventListener('visibilitychange', function waitOn() {
        window.removeEventListener('visibilitychange', waitOn);
        navigator.vibrate([200, 200, 200, 200]);
      });
    } else {
      navigator.vibrate([200, 200, 200, 200]);
    }
  }

  var Notify = {
    ringtone: function notification_ringtone() {
      if (settings['audio.volume.notification'] &&
          settings['notification.ringtone']) {
        ringtone(settings['notification.ringtone']);
      }
    },

    vibrate: function notification_vibrate() {
      if (settings['vibration.enabled']) {
        vibrate();
      }
    }
  };

  exports.Notify = Notify;
}(this));
