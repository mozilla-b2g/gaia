/* globals AudioContext */

/* exported TonePlayer */

'use strict';

const kMasterVolume = 0.5;
const kToneVolume = 0.7;
const kShortPressDuration = 0.15;
const kAttackDuration = 0.025;
const kDecayDuration = 0.025;
const kReleaseDuration = 0.05;

var TonePlayer = {
  _audioContext: null,
  _channel: null,
  _gainNode: null,
  _playingNodes: [],
  _maybeTrashAudio: null,
  _initialized: false,

  /**
   * Initializes the tone player by specifying which channel will be used to
   * play sounds. The TonePlayer will lazily create an AudioContext to play
   * sounds when needed and automatically dispose of it when the application is
   * hidden. However if the 'telephony' channel is used then we'll keep the
   * AudioContext around as long as there's an active call.
   *
   * @param channel {String} The default channel used to play sounds.
   */
  init: function tp_init(channel) {
    var telephony = navigator.mozTelephony;

    this._reset();
    this._channel = channel;
    this._maybeTrashAudio = (function tp_maybeTrashAudio() {
      var callIsActive = telephony && (telephony.calls.length ||
                                       telephony.conferenceGroup.calls.length);

      /* If the application is hidden dispose of the audio context unless we're
       * in a call and we're using the 'telephony' channel. */
      if (document.hidden &&
          !((this._channel === 'telephony') && callIsActive)) {
        this._trashAudio();
      }
    }).bind(this);

    window.addEventListener('visibilitychange', this._maybeTrashAudio);
    telephony && telephony.addEventListener('callschanged',
                                            this._maybeTrashAudio);

    this._initialized = true;
  },

  /**
   * Tears down the tone player and removes the registered event listeners,
   * mostly used for unit-testing.
   */
  teardown: function tp_teardown() {
    var telephony = navigator.mozTelephony;

    telephony && telephony.removeEventListener('callschanged',
                                               this._maybeTrashAudio);
    window.removeEventListener('visibilitychange', this._maybeTrashAudio);
    this._reset();
    this._initialized = false;
  },

  /**
   * Reset all internal state to its default value.
   */
  _reset: function tp_reset() {
    this._audioContext = null;
    this._channel = null;
    this._gainNode = null;
    this._playingNodes = [];
    this._maybeTrashAudio = null;
  },

  _ensureAudio: function tp_ensureAudio() {
    if (this._audioContext || !this._initialized) {
      return;
    }

    if (this._channel) {
      this._audioContext = new AudioContext(this._channel);
    } else {
      // If no channel was specified stick with the default one.
      this._audioContext = new AudioContext();
    }
  },

  _trashAudio: function tp_trashAudio() {
    this.stop();
    this._audioContext = null;
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

    for (i = 0; i < frequencies.length; ++i) {
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
    this._ensureAudio();
    this._startAt(frequencies, 0, shortPress ? kShortPressDuration : 0);
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
    this._ensureAudio();
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
  }
};
