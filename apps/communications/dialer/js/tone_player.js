'use strict';

const kMasterVolume = 0.5;
const kToneVolume = 0.7;
const kShortPressDuration = 0.15;
const kAttackDuration = 0.025;
const kDecayDuration = 0.025;
const kReleaseDuration = 0.05;

var TonePlayer = {
  _audioContext: null,
  _gainNode: null,
  _playingNodes: [],
  _tonesSamples: {
    'resources/tones/tone_1.opus': [697, 1209],
    'resources/tones/tone_2.opus': [697, 1336],
    'resources/tones/tone_3.opus': [697, 1477],
    'resources/tones/tone_4.opus': [770, 1209],
    'resources/tones/tone_5.opus': [770, 1336],
    'resources/tones/tone_6.opus': [770, 1477],
    'resources/tones/tone_7.opus': [852, 1209],
    'resources/tones/tone_8.opus': [852, 1336],
    'resources/tones/tone_9.opus': [852, 1477],
    'resources/tones/tone_star.opus': [941, 1209],
    'resources/tones/tone_0.opus': [941, 1336],
    'resources/tones/tone_hash.opus': [941, 1477]
  },

  init: function tp_init(channel) {
    this.setChannel(channel);
  },

  ensureAudio: function tp_ensureAudio() {
    if (this._audioContext)
      return;

    this._audioContext = new AudioContext();
  },

  trashAudio: function tp_trashAudio() {
    this.stop();
    this._audioContext = null;
  },

  /**
   * XXX workaround for bug 848954, uses samples instead of the Web Audio API
   * to play short tones. Remove this once the original problem is fixed.
   *
   * @param {Array} frequencies Frequencies of the tone to be played, these
   *        will be matched with the appropriate sample
   */
  _playSample: function tp_playSample(frequencies) {
    var sample = null;

    for (var i in this._tonesSamples) {
      if ((frequencies.length === 2) &&
          (frequencies[0] === this._tonesSamples[i][0]) &&
          (frequencies[1] === this._tonesSamples[i][1])) {
        sample = new Audio(i);
        break;
      }
    }

    sample.volume = kMasterVolume;
    sample.play();
  },

  // Pass 0.0 for |when| to play as soon as possible.
  // Pass 0.0 for |duration| to make the tone play until stop is called.
  _startAt: function tp_startAt(frequencies, when, duration) {
    var context = this._audioContext;
    var sampleRate = context.sampleRate;
    var envelope =
      context.createBuffer(1, (duration ? duration : 0.05) * sampleRate,
                           sampleRate);
    // ADSR
    for (var i = 0; i < envelope.length; i++) {
      var factor = kToneVolume;
      var t = i / sampleRate;
      if (t <= kAttackDuration) {
        factor = t / kAttackDuration;
      } else if (t - kAttackDuration <= kDecayDuration) {
        factor = 1.0 - (1.0 - kToneVolume) *
          (t - kAttackDuration) / kDecayDuration;
      }
      if (!duration) {
        // The envelope buffer contains the difference from the sustain value
        factor -= kToneVolume;
      } else if (t > duration - kReleaseDuration) {
        factor *= (duration - t) / kReleaseDuration;
      }
      envelope.getChannelData(0)[i] = factor * kMasterVolume;
    }

    var gainNode = context.createGain();
    gainNode.connect(context.destination);
    if (!duration) {
      // For long presses, the gainNode will be used to release the tone.
      this._gainNode = gainNode;
    }

    var envelopeNode = context.createBufferSource();
    envelopeNode.buffer = envelope;
    envelopeNode.start(when);
    envelopeNode.connect(gainNode.gain);
    // Set the gain which will be summed with the envelope buffer values
    // and will be the constant gain at the end of the tone envelope.  For
    // tones with duration, the envelope covers the entire tone, so the gain
    // at the end is zero.  For tones with no duration, the envelope covers
    // only the attack and delay phases after which the gain is the sustain
    // value.
    gainNode.gain.setValueAtTime(duration ? 0.0 : kToneVolume * kMasterVolume,
                                 0.0);

    for (var i = 0; i < frequencies.length; ++i) {
      var oscNode = this._audioContext.createOscillator();
      oscNode.type = 'sine';
      oscNode.frequency.value = frequencies[i];
      oscNode.start(when);
      if (duration) {
        // If starting immediately, then add some extra time to allow the tone
        // to start, so that the tone doesn't stop short of the end of the
        // envelope.
        oscNode.stop(Math.max(when, context.currentTime + 0.5) + duration);
      } else {
        this._playingNodes.push(oscNode);
      }
      oscNode.connect(gainNode);
    }
  },

  start: function tp_start(frequencies, shortPress) {
    if (shortPress) {
      this._playSample(frequencies);
    } else {
      this._startAt(frequencies, 0, shortPress ? kShortPressDuration : 0);
    }
  },

  stop: function tp_stop() {
    if (!this._gainNode) {
      return;
    }
    var context = this._audioContext;
    var sampleRate = context.sampleRate;
    var gain = this._gainNode.gain;
    this._gainNode = null;

    var ramp =
      context.createBuffer(1, kReleaseDuration * sampleRate, sampleRate);
    for (var i = 0; i < ramp.length; i++) {
      ramp.getChannelData(0)[i] =
        (ramp.length - i - 1) / ramp.length * kToneVolume * kMasterVolume;
    }

    var rampNode = context.createBufferSource();
    rampNode.buffer = ramp;
    rampNode.start();
    rampNode.connect(gain);
    // Change the current base gain from kToneVolume * kMasterVolume to 0,
    // cancelling the initial change from adding the ramp.
    gain.setValueAtTime(0.0, 0.0);

    // Stop the oscillators some time after the release ramp reaches 0.
    // Some extra time is included to allow the release to start.
    while (this._playingNodes.length) {
      this._playingNodes.pop().
        stop(context.currentTime + kReleaseDuration + 0.5);
    }
  },

  // Takes an array of steps, a step being:
  // - frequency for channel 1
  // - frequency for channel 2
  // - duration
  playSequence: function tp_playSequence(sequence) {
    this.ensureAudio();
    // AudioContext.currentTime is the last time received on the main thread
    // from the audio graph.  Trying to start a tone at currentTime will not
    // start playing until this main thread returns to the event loop and
    // sends a message to the audio graph thread.  Allow a little time for
    // this.  The way Gecko processes audio in chunks of 30ms means this
    // should be at least 60 ms.  Experiments on Buri indicate that in
    // practice this delay is 165 to 190 ms, much of which is the code that
    // runs before returning to the event loop.
    var when = this._audioContext.currentTime + 0.2;
    for (var index = 0; index < sequence.length; ++index) {
      var step = sequence[index];
      var frequencies = step.slice(0, 2);
      var duration = step[2] / 1000;
      this._startAt(frequencies, when, duration);
      when += duration;
    }
  },

  setChannel: function tp_setChannel(channel) {
    this.ensureAudio();
    if (channel && (this._audioContext.mozAudioChannelType !== channel)) {
      this._audioContext.mozAudioChannelType = channel;
    }
  }
};
