/* global
  AudioContext,
  Utils
 */

(function(exports) {
  'use strict';

  const SETTINGS = {
    notificationVolume: 'audio.volume.notification',
    vibration: 'vibration.enabled'
  };

  const ATTENTION_PATTERN = [4, 1, 2, 1, 2, 1];
  ATTENTION_PATTERN.push(...ATTENTION_PATTERN);

  const ATTENTION_SOUND_VOLUME = 0.3;

  const ATTENTION_DURATION = 11;

  function getSetting(key) {
    if (!navigator.mozSettings) {
      return Promise.reject(new Error('The mozSettings API is not available.'));
    }

    return navigator.mozSettings.createLock().get(key).then(
      (result) => result[key]
    );
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

  // Converts from the ATTENTION_PATTERN (suitable for the Vibration API) to a
  // Float32Array suitable for the Audio API.
  //
  // The Float32Array will be interpolated so we just need to have the changes.
  // Each value will last a "unit" of time.
  function getAttentionCurveWave() {
    var result = [];
    var currentValue = ATTENTION_SOUND_VOLUME;

    ATTENTION_PATTERN.forEach(duration => {
      for (var i = 0; i < duration; i++) {
        result.push(currentValue);
      }

      currentValue = ATTENTION_SOUND_VOLUME - currentValue;
    });

    return new Float32Array(result);
  }

  function ringtone() {
    var audioChannel = 'notification';
    var audioCtx = new AudioContext(audioChannel);

    var o1 = audioCtx.createOscillator();
    var o2 = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    var time = audioCtx.currentTime;
    o1.type = o2.type = 'sine';
    o1.frequency.value = 853;
    o2.frequency.value = 960;

    o1.start();
    o2.start();
    // Eventually stop the oscillator to allow garbage collecting.
    o1.stop(time + ATTENTION_DURATION);
    o2.stop(time + ATTENTION_DURATION);

    var wave = getAttentionCurveWave();
    gain.gain.setValueCurveAtTime(wave, time, ATTENTION_DURATION);

    o1.connect(gain);
    o2.connect(gain);
    gain.connect(audioCtx.destination);

    return {
      stop: () => { o1.stop(); o2.stop(); }
    };
  }

  function vibrate() {
    var pattern = ATTENTION_PATTERN.map((value) => value * 500);
    // vibration only works when App is in the foreground
    if (document.hidden) {
      window.addEventListener('visibilitychange', function waitOn() {
        window.removeEventListener('visibilitychange', waitOn);
        navigator.vibrate(pattern);
      });
    } else {
      navigator.vibrate(pattern);
    }

    return {
      stop: () => navigator.vibrate(0)
    };
  }

  var Notify = {
    notify: function notification_ringtone() {
      return getSettings(
        [SETTINGS.notificationVolume, SETTINGS.vibration]
      ).then((settings) => {
        var stopFunctions = [];
        if (settings[SETTINGS.notificationVolume]) {
          stopFunctions.push(ringtone());
        }

        if (settings[SETTINGS.vibration]) {
          stopFunctions.push(vibrate());
        }

        // Notify when the attention notification is finished.
        var endDefer = Utils.defer();
        setTimeout(endDefer.resolve, ATTENTION_DURATION);

        return {
          stop: () => stopFunctions.forEach((stopFunc) => stopFunc.stop()),
          endPromise: endDefer.promise
        };
      });
    }
  };

  exports.Notify = Notify;
}(this));
