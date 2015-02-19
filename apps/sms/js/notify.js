/*global SettingsURL */

(function(exports) {
  'use strict';

  var SETTINGS = {
    notificationVolume: 'audio.volume.notification',
    vibration: 'vibration.enabled',
    ringtone: 'notification.ringtone'
  };

  function entry(key, value) {
    if (urls[key]) {
      return new SettingsURL().set(value);
    }
    return value;
  }

  // one day we'll be able to use ES6 initializers instead
  var urls = {};
  urls[SETTINGS.ringtone] = 1;

  function getSetting(key) {
    if (!navigator.mozSettings) {
      return Promise.reject(new Error('The mozSettings API is not available.'));
    }

    var request = navigator.mozSettings.createLock().get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = function() {
        resolve(entry(key, request.result[key]));
      };

      request.onerror = function() {
        reject(new Error('Error while retrieving ' + key));
      };
    });
  }

  function getSettings(settings) {
    return Promise.all(
      settings.map(getSetting)
    ).catch((e) => {
      // catch and log errors
      console.error('Error while retrieving settings', e.message, e);
      return settings.map(() => null);
    }).then((results) => {
      return settings.reduce((result, setting, i) => {
        result[setting] = results[i];
        return result;
      }, {});
    });
  }

  function ringtone(ringtoneFile) {
    var ringtonePlayer = new Audio();
    ringtonePlayer.src = ringtoneFile;
    ringtonePlayer.mozAudioChannelType = 'notification';
    ringtonePlayer.play();
    window.setTimeout(function smsRingtoneEnder() {
      ringtonePlayer.pause();
      ringtonePlayer.removeAttribute('src');
      ringtonePlayer.load();
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
      return getSettings(
        [SETTINGS.notificationVolume, SETTINGS.ringtone]
      ).then((settings) => {
        if (settings[SETTINGS.notificationVolume] &&
            settings[SETTINGS.ringtone]) {
          ringtone(settings[SETTINGS.ringtone]);
        }
      });
    },

    vibrate: function notification_vibrate() {
      return getSettings([SETTINGS.vibration]).then((settings) => {
        if (settings[SETTINGS.vibration]) {
          vibrate();
        }
      });
    }
  };

  exports.Notify = Notify;
}(this));
