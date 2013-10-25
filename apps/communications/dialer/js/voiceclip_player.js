'use strict';

var VoiceClipPlayer = {
  player: null,

  init: function vc_init() {
    this.player = document.getElementById('voiceclip');
  },

  AUDIO_MAP: {
    'd0': '10.ogg',
    'd1': '1.ogg',
    'd2': '2.ogg',
    'd3': '3.ogg',
    'd4': '4.ogg',
    'd5': '5.ogg',
    'd6': '6.ogg',
    'd7': '7.ogg',
    'd8': '8.ogg',
    'd9': '9.ogg',
    'd*': 'thanks.ogg',
    'd#': 'sit.ogg'
  },

  start: function(partialIndex, rate) {
    this.player.pause();
    this.player.src = 'style/audio/' + this.AUDIO_MAP['d' + partialIndex];
    this.player.play();
  }
};
