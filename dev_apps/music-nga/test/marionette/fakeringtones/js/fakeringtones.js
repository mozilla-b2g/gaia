'use strict';

var FakeRingtones = {
  get player() {
    return document.getElementById('player');
  },

  init: function() {
    this.loadMediaSample(function(file) {
      this.setSource(file);
      this.play();
    }.bind(this));
  },

  loadMediaSample: function(callback) {
    var songs = navigator.getDeviceStorage('music');

    var cursor = songs.enumerate();

    cursor.onsuccess = function(event) {
      var file = event.target.result;
      callback(file);
    };

    cursor.onerror = function(event) {
      console.warn('No file found: ' + event.target.error);
    };
  },

  setSource: function(file) {
    var url = window.URL.createObjectURL(file);
    this.player.mozAudioChannelType = 'ringer';
    this.player.src = url;
  },

  play: function() {
    this.player.play();
  }
};

FakeRingtones.init();
