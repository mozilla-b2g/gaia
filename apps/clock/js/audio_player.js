'use strict';
define(function() {
  const ALARM_SETTING = 'audio.volume.alarm';
  var systemAlarmVolume;

  // Settings stores volumes as an integer between [0, SYSTEM_VOLUME_MAX).
  /** The AudioPlayer class manages the playback of alarm ringtones. */
  function AudioPlayer() {
    this.audio = new Audio();
    this.audio.mozAudioChannelType = 'alarm';
    this.audio.loop = true;
  }

  AudioPlayer.prototype = {
    /**
     * Play a ringtone from the shared/resources/media/alarms
     * directory, using the current global volume setting.
     *
     * @param {string} ringtoneName
     */
    playRingtone: function(ringtoneName) {
      this.audio.pause();
      this.audio.src = 'shared/resources/media/alarms/' + ringtoneName;
      this.audio.load(); // Required per MDN's HTMLMediaElement spec.
      this.audio.volume = (systemAlarmVolume / AudioPlayer.SYSTEM_VOLUME_MAX);
      this.audio.play();
    },

    pause: function() { this.audio.pause(); },
    get playing() { return !this.audio.paused; }
  };

  AudioPlayer.getSystemAlarmVolume = function() {
    return systemAlarmVolume;
  };

  AudioPlayer.setSystemAlarmVolume = function(volume, cb) {
    systemAlarmVolume = volume;

    if (navigator.mozSettings) {
      var opts = {};
      opts[ALARM_SETTING] = systemAlarmVolume;
      var req = navigator.mozSettings.createLock().set(opts);
      req.onsuccess = req.onerror = cb;
    } else {
      cb && cb();
    }
  };

  AudioPlayer.SYSTEM_VOLUME_MAX = systemAlarmVolume = 15;

  // Keep systemAlarmVolume in sync with the value from the Settings app.
  if (navigator.mozSettings) {
    navigator.mozSettings.addObserver(ALARM_SETTING, (e) => {
      systemAlarmVolume = e.settingValue;
    });

    var req = navigator.mozSettings.createLock().get(ALARM_SETTING);
    req.onsuccess = () => {
      if (req.result[ALARM_SETTING] !== undefined) {
        systemAlarmVolume = req.result[ALARM_SETTING];
      }
    };
  }

  return AudioPlayer;
});
