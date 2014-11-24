'use strict';

/* global AudioContext */

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

SoundFeedbackPlayer.prototype.prepare = function() {
  if (this._audioCtx) {
    throw 'SoundFeedbackPlayer: prepare() should not be called twice.';
  }

  if (typeof AudioContext === 'undefined') {
    console.error('SoundFeedbackPlayer: No Web Audio API on this platform.');

    return;
  }

  this._audioCtx = new AudioContext();

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
    this._audioCtx.decodeAudioData(arrayBuffer, function(audioBuffer) {
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
