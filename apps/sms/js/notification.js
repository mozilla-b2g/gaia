(function(exports) {
  'use strict';

  var settings = {};
  var mozSettings = navigator.mozSettings;
  var ringtoneURL = new SettingsURL();

  [
    'audio.volume.notification',
    'notification.ringtone',
    'vibration.enabled'
  ].forEach(function(key) {
    if (mozSettings) {
      var request = mozSettings.createLock().get(key);
      request.onsuccess = function() {
        if (key == 'notification.ringtone') {
          ringtoneURL.set(request.result[key]);
          settings[key] = true;
        } else {
          settings[key] = request.result[key];
        }
      };

      mozSettings.addObserver(key, function(event) {
        if (key == 'notification.ringtone') {
          ringtoneURL.set(event.settingValue);
          settings[key] = true;
        } else {
          settings[key] = event.settingValue;
        }
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

  var Notification = {
    ringtone: function notification_ringtone() {
      if (settings['audio.volume.notification'] &&
          settings['notification.ringtone']) {
        ringtone(ringtoneURL.get());
      }
    },

    vibrate: function notification_vibrate() {
      if (settings['vibration.enabled']) {
        vibrate();
      }
    }
  };

  exports.Notification = Notification;
}(this));
