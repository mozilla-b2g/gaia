SoundEffect = (function() {
  'use strict';

  const SHUTTER_KEY = 'camera.shutter.enabled';
  const RECORDING_KEY = 'camera.recordingsound.enabled';
  const TYPE_CAMERA = 'camera';
  const TYPE_RECORDING_START = 'recordingStart';
  const TYPE_RECORDING_END = 'recordingEnd';

  var shutterSoundEnabled = true;
  var recordingSoundEnabled = true;
  var soundAudios = {};
  var soundUrls = {'camera': './resources/sounds/shutter.ogg',
                   'recordingStart': './resources/sounds/camcorder_start.opus',
                   'recordingEnd': './resources/sounds/camcorder_end.opus'};

  function init() {
    if ('mozSettings' in navigator) {
      var req = navigator.mozSettings.createLock().get(SHUTTER_KEY);
      req.onsuccess = function onsuccess() {
        shutterSoundEnabled = req.result[SHUTTER_KEY];
        if (shutterSoundEnabled) {
          // It is important that this sound plays quickly, so initialize
          // it if it will be needed
          initSound(TYPE_CAMERA);
        }
      };

      navigator.mozSettings.addObserver(SHUTTER_KEY, function(e) {
        shutterSoundEnabled = e.settingValue;
      });

      var reqRec = navigator.mozSettings.createLock().get(RECORDING_KEY);
      reqRec.onsuccess = function onsuccess() {
        recordingSoundEnabled = reqRec.result[RECORDING_KEY];
      };

      navigator.mozSettings.addObserver(RECORDING_KEY, function(e) {
        recordingSoundEnabled = e.settingValue;
      });
    }
  }

  function initSound(type) {
    if (!soundAudios[type]) {
      soundAudios[type] = new Audio(soundUrls[type]);
      soundAudios[type].setAttribute('preload', 'auto');
      soundAudios[type].mozAudioChannelType = 'notification';
    }
  }

  function playSound(type, callback) {
    initSound(type);
    var clone = soundAudios[type].cloneNode(false);
    if (callback) {
      clone.onended = function(e) {
        callback();
      };
    }
    clone.play();
  }

  function playCameraShutterSound(callback) {
    if (shutterSoundEnabled) {
      playSound(TYPE_CAMERA, callback);
    }
    else if (callback) {
      callback();
    }
  }

  function playRecordingStartSound() {
    if (recordingSoundEnabled) {
      playSound(TYPE_RECORDING_START);
    }
  }

  function playRecordingEndSound() {
    if (recordingSoundEnabled) {
      playSound(TYPE_RECORDING_END);
    }
  }

  return {
    init: init,
    playCameraShutterSound: playCameraShutterSound,
    playRecordingStartSound: playRecordingStartSound,
    playRecordingEndSound: playRecordingEndSound
  };
})();
