'use strict';

var VoiceClipPlayer = {
  player: null,

  init: function vc_init() {
    this.player = document.getElementById('voiceclip');
    this.player.src = 'style/audio/one-to-ten.ogg';
    // play first to force loading the voice clip
    this.player.play();
    this.player.pause();
  },

  AUDIO_MAP: {
    d0: {
      start: 9.52,
      duration: 0.53
    },
    d1: {
      start: 0.45,
      duration: 0.5
    },
    d2: {
      start: 1.43,
      duration: 0.5
    },
    d3: {
      start: 2.65,
      duration: 0.5
    },
    d4: {
      start: 3.55,
      duration: 0.5
    },
    d5: {
      start: 4.9,
      duration: 0.6
    },
    d6: {
      start: 5.9,
      duration: 0.6
    },
    d7: {
      start: 6.7,
      duration: 0.55
    },
    d8: {
      start: 7.75,
      duration: 0.5
    },
    d9: {
      start: 8.77,
      duration: 0.53
    },
    d10: {
      start: 9.52,
      duration: 0.53
    },
    thank: {
      start: 10.73,
      duration: 1.55
    }
  },

  start: function(partialIndex, rate) {
      var duration, partial,
        self = this;
      if (rate == null) {
        rate = 1.0;
      }
      partial = this.AUDIO_MAP['d' + partialIndex];
      // able to interrupt while playing
      this.player.pause();
      // play
      this.player.currentTime = partial.start;
      this.player.play();
      duration = partial.duration / rate * 1000;
      return setTimeout(function() {
        return self.player.pause();
      }, duration);
    }
};
