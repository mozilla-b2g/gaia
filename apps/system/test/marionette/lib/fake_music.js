'use strict';

function FakeMusic(client, origin) {
  this.client = client;
  this.origin = origin;
}

module.exports = FakeMusic;

FakeMusic.Selector = Object.freeze({
  albumOneElement: '#album-one',

  playPauseElement: '#play-pause',
  stopElement: '#stop',
  previousTrackElement: '#previous',
  nextTrackElement: '#next'
});

FakeMusic.prototype = {
  client: null,

  get albumOneElement() {
    return this.client.findElement(FakeMusic.Selector.albumOneElement);
  },

  get playPauseElement() {
    return this.client.findElement(FakeMusic.Selector.playPauseElement);
  },

  get stopElement() {
    return this.client.findElement(FakeMusic.Selector.stopElement);
  },

  get previousTrackElement() {
    return this.client.findElement(FakeMusic.Selector.previousTrackElement);
  },

  get nextTrackElement() {
    return this.client.findElement(FakeMusic.Selector.nextTrackElement);
  },

  get isPlaying() {
    var className = this.playPauseElement.getAttribute('class');
    return !(/\bis-paused\b/.test(className));
  },

  launchInBackground: function() {
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);

    // Wait until the app has told us it's fully loaded.
    var body = this.client.helper.waitForElement('body.loaded');

    this.client.switchToFrame();
  },

  close: function() {
    this.client.apps.close(this.origin);
  },

  runInApp: function(callback) {
    this.client.apps.switchToApp(this.origin);
    callback();
    this.client.switchToFrame();
  }
};
