'use strict';

var kKeyToneFrames = 1200;

var TonePlayer = {
  _frequencies: null, // from gTonesFrequencies
  _sampleRate: 8000, // number of frames/sec
  _position: null, // number of frames generated
  _intervalID: null, // id for the audio loop's setInterval
  _stopping: false,

  init: function tp_init(channel) {
    this.setChannel(channel);
  },

  ensureAudio: function tp_ensureAudio() {
   if (this._audio)
     return;

   this._audio = new Audio();
   this._audio.volume = 0.5;
  },

  trashAudio: function tp_trashAudio() {
    this.stop();
    delete this._audio;
  },

  // Generating audio frames for the 2 given frequencies
  generateFrames: function tp_generateFrames(soundData, shortPress) {
    var position = this._position;

    var kr = 2 * Math.PI * this._frequencies[0] / this._sampleRate;
    var kc = 2 * Math.PI * this._frequencies[1] / this._sampleRate;

    for (var i = 0; i < soundData.length; i++) {
      // Poor man's ADSR
      // Only short press have a release phase because we don't know
      // when the long press will end
      var factor;
      if (position < 200) {
        // Attack
        factor = position / 200;
      } else if (position > 200 && position < 400) {
        // Decay
        factor = 1 - ((position - 200) / 200) * 0.3; // Decay factor
      } else if (shortPress && position > 800) {
        // Release, short press only
        factor = 0.7 - ((position - 800) / 400 * 0.7);
      } else {
        // Sustain
        factor = 0.7;
      }

      soundData[i] = (Math.sin(kr * position) +
                      Math.sin(kc * position)) / 2 * factor;
      position++;
    }

    this._position += soundData.length;
  },

  start: function tp_start(frequencies, shortPress) {
    this._frequencies = frequencies;
    this._position = 0;
    this._stopping = false;

    // Already playing
    if (this._intervalID) {
      return;
    }

    this._audio.mozSetup(1, this._sampleRate);

    // Writing 150ms of sound (duration for a short press)
    var initialSoundData = new Float32Array(kKeyToneFrames);
    this.generateFrames(initialSoundData, shortPress);

    var wrote = this._audio.mozWriteAudio(initialSoundData);
    var start = 0;

    this._intervalID = setInterval((function audioLoop() {
      start = start + wrote;
      // Continuing playing until .stop() is called for long press in calling
      // state. Or just play one round of data in non calling state.
      if (this._stopping || (start == kKeyToneFrames && shortPress == true)) {
       if (this._intervalID == null)
         return;

        clearInterval(this._intervalID);
        this._intervalID = null;
        return;
      }

      // If shortPress is false then we repeat the tone in call state.
      if (start == kKeyToneFrames) {
        start = 0;
        // Re-generateFrames with sustaining sound.
        this.generateFrames(initialSoundData);
      }

      if (this._audio != null)
        wrote = this._audio.mozWriteAudio(
          initialSoundData.subarray(start, kKeyToneFrames));
    }).bind(this), 30); // Avoiding under-run issues by keeping this low
  },

  stop: function tp_stop() {
    this._stopping = true;

    clearInterval(this._intervalID);
    this._intervalID = null;

    if (this._audio != null)
      this._audio.src = '';
  },

  // Takes an array of steps, a step being:
  // - frequence for canal 1
  // - frequence for canal 2
  // - duration
  playSequence: function tp_playSequence(sequence, index) {
    if (typeof index === 'undefined') {
      index = 0;
    }

    if (index >= sequence.length) {
      return;
    }

    this.ensureAudio();

    var step = sequence[index];
    var frequencies = step.slice(0, 2);
    var duration = step[2];
    this.start(frequencies, false);

    setTimeout(function nextStep(self) {
      self.stop();
      self.playSequence(sequence, (index + 1));
    }, duration, this);
  },

  setChannel: function tp_setChannel(channel) {
    this.ensureAudio();
    if (channel && (this._audio.mozAudioChannelType !== channel)) {
      this._audio.mozAudioChannelType = channel;
    }
  }
};
