/* global define */
define(function(require) {
  'use strict';

  /**
   * The Settings App stores volumes in the range [0, 15] inclusive.
   * Whenever we need to play sounds, though, the Audio object
   * requires a float between [0.0, 1.0]. The conversion has to happen
   * somewhere. The AudioManager here draws the line right out of what
   * gets read from mozSettings.
   *
   * In other words, the conversion is not important to clients of
   * this class, who should treat the volume as a float with no
   * conversion. The only weirdness here is that unit tests must be
   * aware of the slight rounding differences when converting from a
   * float to the system level.
   */

  ////////////////////////////////////////////////////////////////
  // VolumeManager

  function isValidVolume(volume) {
    return (typeof volume === 'number' &&
            volume <= 1.0 &&
            volume >= 0.0);
  }

  var VOLUME_SETTING = 'audio.volume.alarm';
  var SYSTEM_VOLUME_MAX = 15;
  function systemVolumeToFloat(volume) {
    return (volume / SYSTEM_VOLUME_MAX);
  }

  function floatToSystemVolume(volume) {
    return Math.round(volume * SYSTEM_VOLUME_MAX);
  }

  function requestAlarmSystemVolume() {
    // Asynchronously load the alarm volume from mozSettings.
    return new Promise(function(resolve, reject) {
      var lock = navigator.mozSettings.createLock();
      var req = lock.get(VOLUME_SETTING);
      req.onsuccess = function() {
        var volume = systemVolumeToFloat(req.result[VOLUME_SETTING]);
        if (isValidVolume(volume)) {
          globalVolumeManager._volume = volume;
          resolve(volume);
        }
      };

      req.onerror = function() {
        var DEFAULT_VOLUME = 1.0;
        resolve(DEFAULT_VOLUME);
      };
    });
  }

  function VolumeManager() {
    this.VOLUME_KEY = 'defaultAlarmVolume';
    this.DEFAULT_VOLUME = 1.0;
    this._volume = this.DEFAULT_VOLUME;

    if (navigator.mozSettings) {
      navigator.mozSettings.addObserver(
        VOLUME_SETTING,
        this.onSystemAlarmVolumeChange.bind(this));
    }
  }

  VolumeManager.prototype = {
    onSystemAlarmVolumeChange: function(e) {
      // don't use the setter here
      this._volume = systemVolumeToFloat(e.settingValue);
    },

    get volume() {
      return this._volume;
    },

    set volume(volume) {
      this.setVolume(volume);
    },

    /** Set the volume with an optional completion callback. */
    setVolume: function(volume, cb) {
      if (isValidVolume(volume)) {
        this._volume = volume;

        if (navigator.mozSettings) {
          var lock = navigator.mozSettings.createLock();

          var opts = {};
          opts[VOLUME_SETTING] = floatToSystemVolume(volume);
          var req = lock.set(opts);

          if (cb) {
            req.onsuccess = cb;
          }
        }
      }
    }

  };

  ////////////////////////////////////////////////////////////////
  // AudioPlayer

  var globalVolumeManager = new VolumeManager();

  /**
   * The AudioPlayer class manages the playback of alarm ringtones. It
   * is lazy-loading, so that you can instantiate it immediately;
   * Audio objects are not actually created or loaded until you need
   * to play a sound.
   */
  function AudioPlayer() {
    this._audio = null;
  }

  AudioPlayer.prototype = {

    /**
     * Play a ringtone from the shared/resources/media/alarms
     * directory, using the current global volume settings by default.
     * You can override the volume through opts.volume.
     *
     * @param {string} ringtoneName
     * @param {number} opts.volume Value between 0 and 1
     */
    playRingtone: function(ringtoneName, opts) {
      var volume = globalVolumeManager.volume;
      if (opts && 'volume' in opts) {
        volume = opts.volume;
      }
      this._prepare(); // Load up the audio element.
      this._audio.pause();
      this._audio.src = 'shared/resources/media/alarms/' + ringtoneName;
      this._audio.load(); // Required per MDN's HTMLMediaElement spec.
      this._audio.volume = volume;
      this._audio.play();
    },

    /**
     * Pause the currently-playing audio, if possible.
     */
    pause: function() {
      if (this._audio) {
        this._audio.pause();
      }
    },

    // Private methods:

    /**
     * Instantiate the Audio element and prepare it for playback.
     * For internal use only.
     * @private
     */
    _prepare: function() {
      if (!this._audio) {
        this._audio = new Audio();
        this._audio.mozAudioChannelType = 'alarm';
        this._audio.loop = true;
      }
    }
  };

  return {
    getAlarmVolume: function() {
      return globalVolumeManager.volume;
    },
    requestAlarmVolume: function() {
      return requestAlarmSystemVolume();
    },
    setAlarmVolume: function(volume, cb) {
      globalVolumeManager.setVolume(volume, cb);
    },
    createAudioPlayer: function() {
      return new AudioPlayer();
    },
    // Exposed for tests:
    systemVolumeToFloat: systemVolumeToFloat,
    floatToSystemVolume: floatToSystemVolume
  };
});
