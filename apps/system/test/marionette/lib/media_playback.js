'use strict';

function MediaPlaybackTest(client) {
  this.client = client;
}

module.exports = MediaPlaybackTest;

MediaPlaybackTest.Selector = Object.freeze({
  containerElement: '#media-playback-container',
  nowPlayingElement: '#media-playback-nowplaying',
  titleElement: '#media-playback-nowplaying > .title',
  artistElement: '#media-playback-nowplaying > .artist'
});

MediaPlaybackTest.prototype = {
  client: null,
  origin: null,

  get containerElement() {
    return this.client.findElement(MediaPlaybackTest.Selector.containerElement);
  },

  get nowPlayingElement() {
    return this.client.findElement(
      MediaPlaybackTest.Selector.nowPlayingElement);
  },

  get titleElement() {
    return this.client.findElement(MediaPlaybackTest.Selector.titleElement);
  },

  get artistElement() {
    return this.client.findElement(MediaPlaybackTest.Selector.artistElement);
  },

  get titleText() {
    return this.titleElement.getAttribute('textContent');
  },

  get artistText() {
    return this.artistElement.getAttribute('textContent');
  },

  openUtilityTray: function(callback) {
    this.client.executeScript(function() {
      window.wrappedJSObject.UtilityTray.show();
    });

    callback();

    this.client.executeScript(function() {
      window.wrappedJSObject.UtilityTray.hide();
    });
  },

  waitForContainerShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var shown = this.containerElement.displayed();
      return shown === shouldBeShown;
    }.bind(this));
  },

  waitForNowPlayingText: function(artist, title) {
    this.client.waitFor(function() {
      return this.artistText === artist &&
             this.titleText === title;
    }.bind(this));
  }
};
