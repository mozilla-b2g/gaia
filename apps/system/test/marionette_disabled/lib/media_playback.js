'use strict';

var UtilityTray = require('./lib/utility_tray');

function click(client, element) {
  // Make sure the element is displayed first. This seems really unnecessary
  // and is probably masking a bug in Marionette, since all the elements we're
  // clicking on should be displayed thanks to waitForContainerShown.
  if (!element.displayed()) {
    client.waitFor(function() {
      return element.displayed();
    });
  }
  element.click();
}

var utilityTray;

function MediaPlaybackContainer(client, container) {
  this.client = client;
  this.containerElement = container;
  utilityTray = new UtilityTray(client);
}

MediaPlaybackContainer.Selector = Object.freeze({
  nowPlayingElement: '.media-playback-nowplaying',
  controlsElement: '.media-playback-controls',

  trackElement: '.track',

  previousTrackElement: '.previous',
  playPauseElement: '.play-pause',
  nextTrackElement: '.next'
});

MediaPlaybackContainer.prototype = {
  client: null,
  container: null,

  get nowPlayingElement() {
    return this.containerElement.findElement(
      MediaPlaybackContainer.Selector.nowPlayingElement
    );
  },

  get controlsElement() {
    return this.containerElement.findElement(
      MediaPlaybackContainer.Selector.controlsElement
    );
  },

  get trackElement() {
    return this.containerElement.findElement(
      MediaPlaybackContainer.Selector.trackElement
    );
  },

  get previousTrackElement() {
    return this.containerElement.findElement(
      MediaPlaybackContainer.Selector.previousTrackElement
    );
  },

  get playPauseElement() {
    return this.containerElement.findElement(
      MediaPlaybackContainer.Selector.playPauseElement
    );
  },

  get nextTrackElement() {
    return this.containerElement.findElement(
      MediaPlaybackContainer.Selector.nextTrackElement
    );
  },

  get trackText() {
    return this.trackElement.getAttribute('textContent');
  },

  waitForContainerShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var shown = this.containerElement.displayed();
      return shown === shouldBeShown;
    }.bind(this));
  },

  waitForNowPlayingText: function(artist, title) {
    this.client.waitFor(function() {
      return this.trackText === title + ' — ' + artist;
    }.bind(this));
  },

  playPause: function() {
    click(this.client, this.playPauseElement);
  },

  get isPlaying() {
    return this.playPauseElement.getAttribute('data-icon') === 'pause';
  },

  previousTrack: function() {
    click(this.client, this.previousTrackElement);
  },

  nextTrack: function() {
    click(this.client, this.nextTrackElement);
  }
};

function MediaPlayback(client) {
  this.client = client;
}

module.exports = MediaPlayback;

MediaPlayback.Selector = Object.freeze({
  notificationContainerElement: '#media-playback-container',
  lockscreenContainerElement: '#lockscreen-media-container'
});

MediaPlayback.prototype = {
  client: null,

  get notificationContainerElement() {
    return this.client.findElement(
      MediaPlayback.Selector.notificationContainerElement
    );
  },

  get lockscreenContainerElement() {
    var lockScreenFrame = this.client.findElement('#lockscreen-frame');
    if (!lockScreenFrame) {
      throw new Error('--- no lockscreen frame ---');
    }
    this.client.switchToFrame(lockScreenFrame);
    var container = this.client.findElement(
      MediaPlayback.Selector.lockscreenContainerElement
    );
    this.client.switchToFrame();
    return container;
  },

  inUtilityTray: function(callback) {
    utilityTray.open();
    callback(new MediaPlaybackContainer(
      this.client, this.notificationContainerElement
    ));
    utilityTray.close();
  },

  lockScreen: function() {
    this.client.executeScript(function() {
      window.wrappedJSObject.Service.request('lock', { 'forcibly': true });
    });
  },

  unlockScreen: function() {
    this.client.executeScript(function() {
      window.wrappedJSObject.Service.request('unlock', { 'forcibly': true });
    });
  },

  inLockscreen: function(callback) {
    this.lockScreen();
    callback(new MediaPlaybackContainer(
      this.client, this.lockscreenContainerElement
    ));
    this.unlockScreen();
  }
};
