/* global VideoPlayer, Connector, SimpleKeyNavigation, KeyNavigationAdapter,
          evt
 */
(function(exports) {
  'use strict';

  var uiID = {
    player : 'player',
    loadingUI : 'loading-section',
    controlPanel : 'video-control-panel',
    backwardButton : 'backward-button',
    playButton : 'play-button',
    forwardButton : 'forward-button'
  };

  function $(id) {
    return document.getElementById(id);
  }

  function FlingPlayer(videoPlayer, connector) {
    this._player = videoPlayer;
    this._connector = connector;
  }

  var proto = FlingPlayer.prototype;

  proto.CONTROL_PANEL_HIDE_DELAY_SEC = 3000;

  proto.init = function fp_init() {

    this._focusedControl = null;
    this._hideControlsTimer = null;

    this._loadingUI = $(uiID.loadingUI);
    this._controlPanel = $(uiID.controlPanel);
    this._backwardButton = $(uiID.backwardButton);
    this._playButton = $(uiID.playButton);
    this._forwardButton = $(uiID.forwardButton);

    this._initSession();
    this._initPlayer();

    this._keyNav = new SimpleKeyNavigation();

    this._keyNav.start(
      [this._backwardButton, this._playButton, this._forwardButton],
      SimpleKeyNavigation.DIRECTION.HORIZONTAL
    );
    this._keyNav.on('focusChanged', this.onFocusChanged.bind(this));
    this._keyNav.focusOn(this._playButton);

    this._keyNavAdapter = new KeyNavigationAdapter();
    this._keyNavAdapter.init();
    this._keyNavAdapter.on('enter-keyup', this.onEnter.bind(this));

    document.addEventListener('visibilitychange', function visibilityChanged() {
      // We don't need to restore the video while visibilityState goes back
      // because system app will kill the original one and relaunch a new one.
      if (document.visibilityState === 'hidden') {
        this._player.release();
      }
    }.bind(this));
  };

  proto._initSession = function fp_initSession() {
    this._connector.init();

    this._connector.on('loadRequest', this.onLoadRequest.bind(this));
    this._connector.on('playRequest', this.onPlayRequest.bind(this));
    this._connector.on('pauseRequest', this.onPauseRequest.bind(this));
    this._connector.on('seekRequest', this.onSeekRequest.bind(this));
  };

  proto._initPlayer = function fp_initPlayer() {
    this._player.init();

    this._player.addEventListener('loadedmetadata', this);
    this._player.addEventListener('seeked', this);
    this._player.addEventListener('waiting', this);
    this._player.addEventListener('playing', this);
    this._player.addEventListener('timeupdate', this);
    this._player.addEventListener('pause', this);
    this._player.addEventListener('ended', this);
    this._player.addEventListener('error', this);
  };

  // <UI handling>

  /**
   * @param {Boolean} autoHide Auto hide the controls later. Default to false
   */
  proto.showControlPanel = function fp_showControlPanel(autoHide) {

    if (this._hideControlsTimer) {
      clearTimeout(this._hideControlsTimer);
      this._hideControlsTimer = null;
    }

    this._controlPanel.classList.remove('fade-out');

    if (autoHide === true) {
      proto.hideControlPanel();
    }
  };

  /**
   * @param {Boolean} immediate Hide immediately or later. Default to false.
   */
  proto.hideControlPanel = function fp_hideControlPanel(immediate) {

    if (this._hideControlsTimer) {
      clearTimeout(this._hideControlsTimer);
      this._hideControlsTimer = null;
    }

    if (immediate === true) {

      if (!this._controlPanel.classList.contains('fade-out')) {
        this._controlPanel.classList.add('fade-out');
      }

    } else {

      this._hideControlsTimer = setTimeout(() => {
        this.hideControlPanel(true);
      }, this.CONTROL_PANEL_HIDE_DELAY_SEC);
    }
  };

  proto.setLoading = function fp_setLoading(loading) {
    this._loadingUI.hidden = !loading;
  };
  // </UI handling>

  // <Event handling>
  proto.handleEvent = function fp_handleEvent(e) {

    console.log('FlingPlayer#handleEvent: e.type = ' + e.type);

    var data = { 'time': this._player.currentTime };

    switch (e.type) {

      case 'waiting':
        this.setLoading(true);
        this._connector.reportStatus('buffering', data);
      break;

      case 'loadedmetadata':
        this._connector.reportStatus('loaded', data);
      break;

      case 'playing':
        this.setLoading(false);
        this._connector.reportStatus('buffered', data);
        this.showControlPanel(true);
        this._playButton.textContent = 'Pause';
        this._connector.reportStatus('playing', data);
      break;

      case 'seeked':
        this._connector.reportStatus('seeked', data);
      break;

      case 'ended':
      case 'paused':
        this.showControlPanel(true);
        this._playButton.textContent = 'Play';
        this._connector.reportStatus('stopped', data);
      break;

      case 'error':
        this.setLoading(false);
        data.error = evt.target.error.code;
        this._connector.reportStatus('error', data);
      break;
    }
  };

  proto.onLoadRequest = function (e) {
    this._player.load(e.url);
  };

  proto.onPlayRequest = function () {
    this._player.play();
  };

  proto.onPauseRequest = function () {
    this._player.pause();
  };

  proto.onSeekRequest = function (e) {
    this._player.seek(e.time);
  };

  proto.onFocusChanged = function (elem) {
    console.log('FlingPlayer#onFocusChanged: elem = ', elem);
    this._focusedControl = elem;
  };

  proto.onEnter = function () {

    console.log('FlingPlayer#onEnter');

    if (this._focusedControl) {

      console.log('FlingPlayer#onEnter: control focused = ',
        this._focusedControl);

      switch (this._focusedControl.id) {

        case uiID.backwardButton:
        break;

        case uiID.playButton:
          if (this._player.isPlaying()) {
            this._player.pause();
          } else {
            this._player.play();
          }
        break;

        case uiID.forwardButton:
        break;
      }
    }
  };
  // </Event handling>

  exports.FlingPlayer = FlingPlayer;

  window.onload = function() {

    window.fp = new FlingPlayer(
      new VideoPlayer($(uiID.player)),
      new Connector(navigator.presentation)
    );

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
