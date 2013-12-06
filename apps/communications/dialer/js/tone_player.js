'use strict';

const kMasterVolume = 0.5;
const kToneVolume = 0.7;
const kShortPressDuration = 0.25;

var TonePlayer = {
  _audioContext: null,
  _gainNode: null,
  _playingNodes: [],

  init: function tp_init(channel) {
    this.setChannel(channel);
  },

  ensureAudio: function tp_ensureAudio() {
    if (this._audioContext)
      return;

    this._audioContext = new AudioContext();

    this._gainNode = this._audioContext.createGain();
    this._gainNode.gain.value = kMasterVolume;
    this._gainNode.connect(this._audioContext.destination);
  },

  trashAudio: function tp_trashAudio() {
    this.stop();
    this._gainNode = null;
    this._audioContext = null;
  },

  start: function tp_start(frequencies, shortPress) {
    var now = this._audioContext.currentTime;

    var envelopeNode = this._audioContext.createGain();
    var gain = envelopeNode.gain;
    gain.setValueAtTime(0.0, now);
    gain.linearRampToValueAtTime(1.0, now + 0.025);
    gain.linearRampToValueAtTime(kToneVolume, now + 0.05);
    if (shortPress) {
      gain.setValueAtTime(kToneVolume, now + kShortPressDuration - 0.025);
      gain.linearRampToValueAtTime(0.0, now + kShortPressDuration);
    }
    envelopeNode.connect(this._gainNode);

    for (var i = 0; i < frequencies.length; ++i) {
      var oscNode = this._audioContext.createOscillator();
      oscNode.type = 'sine';
      oscNode.frequency.value = frequencies[i];
      oscNode.start(now);
      if (shortPress) {
        oscNode.stop(now + kShortPressDuration);
      } else {
        this._playingNodes.push(oscNode);
      }
      oscNode.connect(envelopeNode);
    }
  },

  stop: function tp_stop() {
    while (this._playingNodes.length) {
      this._playingNodes.pop().stop(0);
    }
  },

  // Takes an array of steps, a step being:
  // - frequency for channel 1
  // - frequency for channel 2
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
    if (channel && (this._audioContext.mozAudioChannelType !== channel)) {
      this._audioContext.mozAudioChannelType = channel;
    }
  }
};
