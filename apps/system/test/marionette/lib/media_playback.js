'use strict';

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

function MediaPlaybackContainer(client, container) {
  this.client = client;
  this.containerElement = container;
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
    return this.client.findElement(
      MediaPlayback.Selector.lockscreenContainerElement
    );
  },

  openUtilityTray: function() {
    this.client.executeScript(function() {
      window.wrappedJSObject.UtilityTray.show();
    });
  },

  closeUtilityTray: function() {
    this.client.executeScript(function() {
      window.wrappedJSObject.UtilityTray.hide();
    });
  },

  inUtilityTray: function(callback) {
    this.openUtilityTray();
    callback(new MediaPlaybackContainer(
      this.client, this.notificationContainerElement
    ));
    this.closeUtilityTray();
  },

  lockScreen: function() {
    this.client.executeScript(function() {
      // The lockscreen window would not be active while we do the test.
      // XXX: This is a strange issue that only happen on B2G desktop:
      // the lockscreen window suddenly disappear after the simulator is ready.
      var lwm = window.wrappedJSObject.lockScreenWindowManager,
          needRelock = !lwm.states.instance.isActive();
      if (needRelock) {
        lwm.closeApp();
        lwm.openApp();
      }
      window.wrappedJSObject.lockScreen.lock();
    });
  },

  unlockScreen: function() {
    this.client.executeScript(function() {
      window.wrappedJSObject.lockScreen.unlock();
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
