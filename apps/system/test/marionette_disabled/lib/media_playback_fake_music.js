'use strict';
(function(module) {
  var FakeMusic = function() {
    var appScheme = 'app://';
    this.selector = {
      albumOneElement: '#album-one',
      playPauseElement: '#play-pause',
      stopElement: '#stop',
      previousTrackElement: '#previous',
      nextTrackElement: '#next',
      interruptElement: '#interrupt'
    };
    this.domain = 'fakemusic.gaiamobile.org';
    this.origin = appScheme + this.domain;
    this.path = __dirname + '/../../apps/fakemusic';
  };

  module.exports = FakeMusic;
})(module);
