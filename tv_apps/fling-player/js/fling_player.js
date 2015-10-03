/* global VideoPlayer, Connector, SimpleKeyNavigation, KeyNavigationAdapter,
          evt, mDBG
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
    bufferedTimeBar : 'buffered-time-bar',
    elapsedTimeBar : 'elapsed-time-bar',
    elapsedTime : 'elapsed-time',
    durationTime : 'duration-time'
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
  proto.AUTO_SEEK_LONG_PRESSED_SEC = 5;
  proto.AUTO_SEEK_STEP_NORMAL_SEC = 10;
  proto.AUTO_SEEK_STEP_LARGE_SEC = 30;

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
    this._bufferedTimeBar = $(uiID.bufferedTimeBar);
    this._elapsedTimeBar = $(uiID.elapsedTimeBar);
    this._elapsedTime = $(uiID.elapsedTime);
    this._durationTime = $(uiID.durationTime);

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
    this._player.addEventListener('pause', this);
    this._player.addEventListener('ended', this);
    this._player.addEventListener('error', this);
  };

  // UI handling

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

  /**
   * @param {string} type buffered or elapsed
   * @param {number} sec the sec in video you want to move to
   */
  proto.moveTimeBar = function (type, sec) {

    mDBG.log('FlingPlayer#moveTimeBar');
    mDBG.log('Move type ', type);
    mDBG.log('Move to ', sec);

    var timeBar = this[`_${type}TimeBar`];
    var duration = this._player.getVideo().duration;

    if (!timeBar ||
        typeof sec != 'number' ||
        isNaN(sec) ||
        sec < 0 ||
        sec > duration
    ) {
      mDBG.warn('Not moving due to corrupt type or sec!');
      return;
    }

    mDBG.log('Move to ', (100 * sec / duration) + '%');

    timeBar.style.width = (100 * sec / duration) + '%';
  };

  // UI handling end

  // Video handling

  proto._startAutoSeek = function fp_startAutoSeek(dir) {

    if (this._autoSeekStartTime == null) { // Do not double start

      this._autoSeekStartTime = (new Date()).getTime();
      this._autoSeekDirection = dir;
      this._autoSeek();
    }
  };

  proto._stopAutoSeek = function fp_stopAutoSeek(dir) {
    this._autoSeekStartTime = null;
    this._autoSeekDirection = null;
  };

  proto._autoSeek = function fp_autoSeek() {

    if (this._autoSeekStartTime != null) {

      var current = this._player.getVideo().currentTime;
      var factor = (this._autoSeekDirection == 'backward') ? -1 : 1;
      var seekDuration = (new Date()).getTime() - this._autoSeekStartTime;
      var seekStep = (seekDuration > this.AUTO_SEEK_LONG_PRESSED_SEC) ?
              this.AUTO_SEEK_STEP_LARGE_SEC : this.AUTO_SEEK_STEP_NORMAL_SEC;

      current += factor * seekStep;

      this._player.seek(current);
      this.moveTimeBar('elapsed', current);
      // TODO: Update time info

      setTimeout(this._autoSeek.bind(this), this.AUTO_SEEK_INTERVAL_MS);
    }
  };

  // Video handling end

  // Event handling
  proto.handleEvent = function fp_handleEvent(e) {

    mDBG.log('FlingPlayer#handleEvent: e.type = ' + e.type);

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
    mDBG.log('FlingPlayer#onFocusChanged: elem = ', elem);
    this._focusedControl = elem;
  };

  proto.onKeyEnterDown = function () {
    mDBG.log('FlingPlayer#onKeyEnterDown');

    if (this._focusedControl) {

      mDBG.log('control focused = ', this._focusedControl);

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
    mDBG.log('FlingPlayer#onKeyEnterUp');

    if (this._focusedControl) {
      mDBG.log('control focused = ', this._focusedControl);

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
  // Event handling end

  exports.FlingPlayer = FlingPlayer;

  window.onload = function() {

    var presentation = navigator.presentation;

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
