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
    forwardButton : 'forward-button',
    elapsedTimeBar : 'elapsed-time-bar'
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
  proto.AUTO_SEEK_INTERVAL_MS = 330;

  proto.init = function fp_init() {

    this._autoSeekDirection = null; // 'backward' or 'forward'
    this._autoSeekStartTime = null; // in ms
    this._focusedControl = null;
    this._hideControlsTimer = null;

    this._loadingUI = $(uiID.loadingUI);
    this._controlPanel = $(uiID.controlPanel);
    this._backwardButton = $(uiID.backwardButton);
    this._playButton = $(uiID.playButton);
    this._forwardButton = $(uiID.forwardButton);
    this._elapsedTimeBar = $(uiID.elapsedTimeBar);

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
    this._keyNavAdapter.on('enter', this.onKeyEnterDown.bind(this));
    this._keyNavAdapter.on('enter-keyup', this.onKeyEnterUp.bind(this));

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

  proto.setLoading = function fp_setLoading(loading) {
    this._loadingUI.hidden = !loading;
  };

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

  proto.moveTimeBar = function (sec) {

    console.log('FlingPlayer#moveTimeBar');

    console.log('Move to ', sec);

    var duration = this._player.getVideo().duration;

    // TMP
    duration = _TMP_duration;

    if (typeof sec != 'number' ||
        (sec >= 0) === false ||
        (sec <= duration) === false
    ) {
      return;
    }

    console.log('Move to ', (100 * sec / duration) + '%');

    // TODO: If buffered time bar is confirmed, then we have to consider it
    this._elapsedTimeBar.style.width = (100 * sec / duration) + '%';
  };

  // </UI handling>

  // <Video handling>

  proto._startAutoSeek = function fp_startAutoSeek(dir) {

    if (this._autoSeekStartTime == null) { // Do not double start

      this._autoSeekDirection = dir;

      this._autoSeekStartTime = (new Date()).getTime();

      this._autoSeek();
    }
  };

  proto._stopAutoSeek = function fp_stopAutoSeek(dir) {
    this._autoSeekDirection = null;
    this._autoSeekStartTime = null;
  };
var _TMP_duration = 600, _TMP_current = _TMP_duration * 0.33;
  proto._autoSeek = function fp_autoSeek() {

    if (this._autoSeekStartTime != null) {

      var current = this._player.getVideo().currentTime;

      current = _TMP_current;

      var factor = (this._autoSeekDirection == 'backward') ? -1 : 1;
      var seekDuration = (new Date()).getTime() - this._autoSeekStartTime;
      var seekStep = (seekDuration > 5) ? 10 : 1;

      current += factor * seekStep;

      _TMP_current = current;

      this._player.seek(current);
      this.moveTimeBar(current);
      // TODO: Update time info

      setTimeout(this._autoSeek.bind(this), this.AUTO_SEEK_INTERVAL_MS);
    }
  };

  // </Video handling>

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

  proto.onKeyEnterDown = function () {

    console.log('FlingPlayer#onKeyEnterDown');

    if (this._focusedControl) {

      console.log('control focused = ', this._focusedControl);

      switch (this._focusedControl.id) {

        case uiID.backwardButton:
        case uiID.forwardButton:
          if (this._focusedControl === this._backwardButton) {
            this._startAutoSeek('backward');
          } else {
            this._startAutoSeek('forward');
          }
        break;
      }
    }
  };

  proto.onKeyEnterUp = function () {

    console.log('FlingPlayer#onKeyEnterUp');

    if (this._focusedControl) {

      console.log('control focused = ', this._focusedControl);

      switch (this._focusedControl.id) {

        case uiID.playButton:
          if (this._player.isPlaying()) {
            this._player.pause();
          } else {
            this._player.play();
          }
        break;

        case uiID.backwardButton:
        case uiID.forwardButton:
          this._stopAutoSeek();
        break;
      }
    }
  };
  // </Event handling>

  exports.FlingPlayer = FlingPlayer;

  window.onload = function() {

    // TMP
    var presentation = navigator.presentation || {
      addEventListener : function () {}
    };
    // TMP end

    window.fp = new FlingPlayer(
      new VideoPlayer($(uiID.player)),
      new Connector(presentation)
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
