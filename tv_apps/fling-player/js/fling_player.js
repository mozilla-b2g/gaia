/* global VideoPlayer, Connector */
(function(exports) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function FlingPlayer() {}

  var proto = FlingPlayer.prototype;

  proto.init = function fp_init() {
    this._loadingUI = $('loading-section');
    this._controlBar = $('video-control-bar');
    this.initPlayer();
    this.initSession();
    document.addEventListener('visibilitychange', function visibilityChanged() {
      // We don't need to restore the video while visibilityState goes back
      // because system app will kill the original one and relaunch a new one.
      if (document.visibilityState === 'hidden') {
        this._player.release();
      }
    }.bind(this));
  };

  proto.initSession = function fp_initSession() {
    this._connector = new Connector(this._player);
    this._connector.init();
  };

  proto.initPlayer = function fp_initPlayer() {
    this._player = new VideoPlayer();
    this._player.init();
    this._player.on('buffering', this.setLoading.bind(this, true));
    this._player.on('buffered', this.setLoading.bind(this, false));
    this._player.on('playing', this.touchControlBar.bind(this, true));
    this._player.on('paused', this.touchControlBar.bind(this, false));
    this._player.on('error', function(id) {
      this.setLoading(false);
    }.bind(this));
  };

  proto.touchControlBar = function fp_handlePlaying(playing) {
    this._controlBar.classList.remove('fade-out');

    if (this._touchBarTimeout) {
      clearTimeout(this._touchBarTimeout);
      this._touchBarTimeout = null;
    }

    this._touchBarTimeout = setTimeout(function() {
      this._touchBarTimeout = null;
      if (!this._controlBar.classList.contains('fade-out')) {
        this._controlBar.classList.add('fade-out');
      }
    }.bind(this),  3000);
  };

  proto.setLoading = function fp_setLoading(loading) {
    this._loadingUI.hidden = !loading;
  };

  exports.FlingPlayer = FlingPlayer;

  window.onload = function() {
    window.fp = new FlingPlayer();
    window.fp.init();

    if (document.visibilityState === 'hidden') {
      navigator.mozApps.getSelf().onsuccess = function(evt) {
        var app = evt.target.result;
        if (app) {
          app.launch();
        }
      };
    }
  };
})(window);
