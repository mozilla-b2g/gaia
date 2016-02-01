'use strict';

function VideoPlayer(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
  this.chromeClient = client.scope({
    searchTimeout: 20000,
    context: 'chrome'
  });
}

module.exports = VideoPlayer;

VideoPlayer.prototype = {
  client: null,

  Selectors: Object.freeze({
    root: 'video',
    playButton: 'playButton',
    muteButton: 'muteButton',
    fullscreenButton: 'fullscreenButton'
  }),

  get rootElement() {
    return this.client.helper.waitForElement(this.Selectors.root);
  },

  get currentTimestamp() {
    return parseFloat(this.rootElement.getAttribute('currentTime'));
  },

  isPlaying: function() {
    return this.rootElement.getAttribute('paused') !== 'true';
  },

  isMuted: function() {
    return this.rootElement.getAttribute('muted') === 'true';
  },

  isFullScreen: function() {
    return this.client.executeScript(function() {
      var fullScreenElement = document.mozFullScreenElement;
      var videoElement = document.querySelector('video');
      return fullScreenElement === videoElement;
    });
  },

  waitForVideoLoaded: function() {
    this.client.waitFor(function() {
      return this.rootElement.getAttribute('readyState') === '4';
    }.bind(this));
  },

  visibleControls: function() {
    var location = this._getLocation(this.Selectors.playButton);
    return location.x > 0;
  },

  invokeControls: function() {
    if(this.visibleControls()) {
      this.rootElement.tap(0, 0);
      this.client.waitFor(function() {
        return !this.visibleControls();
      }.bind(this));
    }
    this.rootElement.tap();
    this.client.waitFor(function() {
      return this.visibleControls();
    }.bind(this));
  },

  _tapVideoControl: function(name) {
    var location = this._getLocation(name);
    this.rootElement.tap(location.x, location.y);
  },

  _getLocation: function(name) {
    var url = this.client.getUrl();
    return this.chromeClient.executeScript(function(url, name) {
      var Components = window.Components;
      var systemFrame = document.querySelector(
        'iframe[mozapp="app://system.gaiamobile.org/manifest.webapp"]');
      var systemDoc = systemFrame.contentWindow.document;
      var frame = systemDoc.querySelector('iframe[src="' + url + '"');
      var video = frame.contentWindow.document.querySelector('video');
      var a = Components.classes['@mozilla.org/inspector/dom-utils;1']
        .getService(Components.interfaces.inIDOMUtils)
        .getChildrenForNode(video, true);

      var element = a[1].ownerDocument
        .getAnonymousElementByAttribute(a[1], 'class', name);
      var videoPosition = video.getBoundingClientRect();
      var elementPosition = element.getBoundingClientRect();
      var x = elementPosition.x - videoPosition.x;
      var y = elementPosition.y - videoPosition.y;
      return {x: x, y: y};
    }, [url, name]);
  },

  tapPlay: function() {
    this._tapVideoControl(this.Selectors.playButton);
    this.client.waitFor(function() {
      return this.isPlaying();
    }.bind(this));
  },

  tapPause: function() {
    this._tapVideoControl(this.Selectors.playButton);
    this.client.waitFor(function() {
      return !this.isPlaying();
    }.bind(this));
  },

  tapMute: function() {
    this._tapVideoControl(this.Selectors.muteButton);
    this.client.waitFor(function() {
      return this.isMuted();
    }.bind(this));
  },

  tapUnmute: function() {
    this._tapVideoControl(this.Selectors.muteButton);
    this.client.waitFor(function() {
      return !this.isMuted();
    }.bind(this));
  },

  tapFullscreen: function() {
    this._tapVideoControl(this.Selectors.fullscreenButton);
  }
};
