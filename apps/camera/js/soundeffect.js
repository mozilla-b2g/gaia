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

  function playSound(type) {
    if (!soundAudios[type]) {
      soundAudios[type] = new Audio(soundUrls[type]);
      soundAudios[type].mozAudioChannelType = 'notification';
    }
    soundAudios[type].cloneNode(false).play();
  }

  function playCameraShutterSound() {
    if (shutterSoundEnabled) {
      playSound(TYPE_CAMERA);
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
