'use strict';

function FakeMusic(client, origin) {
  this.client = client;
  this.origin = origin;
}

module.exports = FakeMusic;

FakeMusic.Selector = Object.freeze({
  albumOneElement: '#album-one',

  playElement: '#play',
  pauseElement: '#pause',
  stopElement: '#stop',
  previousTrackElement: '#previous',
  nextTrackElement: '#next'
});

FakeMusic.prototype = {
  client: null,

  get albumOneElement() {
    return this.client.findElement(FakeMusic.Selector.albumOneElement);
  },

  get playElement() {
    return this.client.findElement(FakeMusic.Selector.playElement);
  },

  get pauseElement() {
    return this.client.findElement(FakeMusic.Selector.pauseElement);
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
