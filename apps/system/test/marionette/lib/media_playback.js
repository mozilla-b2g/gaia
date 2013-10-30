'use strict';

function click(client, element) {
  // Make sure the element is displayed first. This seems really unnecessary
  // and is probably masking a bug in Marionette, since all the elements we're
  // clicking on should be displayed thanks to waitForContainerShown.
  if (!element.displayed()) {
    this.client.waitFor(function() {
      return element.displayed();
    });
  }
  element.click();
}

function MediaPlaybackTest(client) {
  this.client = client;
}

module.exports = MediaPlaybackTest;

MediaPlaybackTest.Selector = Object.freeze({
  containerElement: '#media-playback-container',
  nowPlayingElement: '#media-playback-nowplaying',

  titleElement: '#media-playback-nowplaying > .title',
  artistElement: '#media-playback-nowplaying > .artist',

  previousTrackElement: '#media-playback-controls > .previous',
  playPauseElement: '#media-playback-controls > .play-pause',
  nextTrackElement: '#media-playback-controls > .next'
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

  get previousTrackElement() {
    return this.client.findElement(
      MediaPlaybackTest.Selector.previousTrackElement);
  },

  get playPauseElement() {
    return this.client.findElement(MediaPlaybackTest.Selector.playPauseElement);
  },

  get nextTrackElement() {
    return this.client.findElement(MediaPlaybackTest.Selector.nextTrackElement);
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
  },

  playPause: function() {
    click(this.client, this.playPauseElement);
  },

  get isPlaying() {
    var className = this.playPauseElement.getAttribute('class');
    return !(/\bis-paused\b/.test(className));
  },

  previousTrack: function() {
    click(this.client, this.previousTrackElement);
  },

  nextTrack: function() {
    click(this.client, this.nextTrackElement);
  }
};
