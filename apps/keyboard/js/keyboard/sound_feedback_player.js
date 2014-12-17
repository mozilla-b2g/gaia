'use strict';

/* global AudioContext, OfflineAudioContext */

/**
 * SoundFeedbackPlayer is designed to be thrown away when not needed in order
 * to conserve memory. When it is initalized and prepare()'d, call play()
 * will schedule a clicker sound in the Web Audio thread.
 */
(function(exports) {

var SoundFeedbackPlayer = function() {
  this._audioCtx = null;
  this._clickerAudioBuf = null;
  this._specialClickerAudioBuf = null;
};

SoundFeedbackPlayer.prototype.CLICK_SOUND_URL =
  './resources/sounds/key.wav';
SoundFeedbackPlayer.prototype.SPECIAL_SOUND_URL =
  './resources/sounds/special.wav';

SoundFeedbackPlayer.prototype.activate = function() {
  if (this._audioCtx) {
    return;
  }

  // Hold an AudioContext instance implying turing on the audio hardware.
  this._audioCtx = new AudioContext();
};

SoundFeedbackPlayer.prototype.deactivate = function() {
  // Release the instance (thus turing off the audio hardware).
  this._audioCtx = null;
};

SoundFeedbackPlayer.prototype.prepare = function() {
  if (typeof AudioContext === 'undefined' ||
      typeof OfflineAudioContext === 'undefined') {
    console.error('SoundFeedbackPlayer: No Web Audio API on this platform.');

    return;
  }

  var clickerPromise =
    this._getAudioFileAsArrayBuffer(this.CLICK_SOUND_URL)
      .then(this._decodeAudioData.bind(this))
      .then(function(audioBuffer) {
        this._clickerAudioBuf = audioBuffer;
      }.bind(this));

  var specialClickerPromise =
    this._getAudioFileAsArrayBuffer(this.SPECIAL_SOUND_URL)
      .then(this._decodeAudioData.bind(this))
      .then(function(audioBuffer) {
        this._specialClickerAudioBuf = audioBuffer;
      }.bind(this));

  return Promise.all([clickerPromise, specialClickerPromise])
    .catch(function(e) { console.error(e); throw e; });
};

SoundFeedbackPlayer.prototype._getAudioFileAsArrayBuffer = function(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
      if (!xhr.response) {
        reject('SoundFeedbackPlayer: Cannot load file: ' + url);
        return;
      }

      resolve(xhr.response);
    };
    xhr.send();
  });
};

SoundFeedbackPlayer.prototype._decodeAudioData = function(arrayBuffer) {
  return new Promise(function(resolve, reject) {
    // We are using OfflineAudioContext here so we could decode audio data
    // without activating the audio hardware.
    // The first two arguments (numOfChannels, length) has no meaning in our
    // use case here.
    // The 3rd argument (sampleRate) should match the sample rate of the files
    // so that we don't downgrade the sound quality.
    var ctx = new OfflineAudioContext(2, 1, 44100);
    ctx.decodeAudioData(arrayBuffer, function(audioBuffer) {
      resolve(audioBuffer);
    }, function() {
      reject('SoundFeedbackPlayer: decodeAudioData failed.');
    });
  }.bind(this));
};

SoundFeedbackPlayer.prototype.play = function(isSpecialKey) {
  if (!this._clickerAudioBuf || !this._specialClickerAudioBuf) {
    // It's possible to queue the call after the promise chain in prepare()
    // at this point, _in the main thread_, but since the user is not likely
    // tapping faster than xhr and decodeAudioData(), this "defect" doesn't
    // warrant the complexity.
    console.warn('SoundFeedbackPlayer: ' +
      'Sound feedback needed but audio buffer is not available yet.');

    return;
  }

  if (!this._audioCtx) {
    console.error('SoundFeedbackPlayer: play() is called but not activated?');

    return;
  }

  var ctx = this._audioCtx;

  // Create a new AudioBufferSourceNode for playback.
  var source = ctx.createBufferSource();
  source.buffer =
    isSpecialKey ? this._specialClickerAudioBuf : this._clickerAudioBuf;
  source.connect(ctx.destination);
  source.start(0);
};

exports.SoundFeedbackPlayer = SoundFeedbackPlayer;

})(window);
