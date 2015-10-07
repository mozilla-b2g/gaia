/* global VideoPlayer, Connector, mDBG, KeyNavigationAdapter,
          SimpleKeyNavigation
 */
(function(exports) {
  'use strict';

  // Helping variables, methods

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

  // Helping variables, methods end
  /**
   * FlingPlayer could be controlled by 2 sources.
   * The 1st source is remote control device, like Fennec,
   * which sends command through the Presentation API.
   * The 2nd source is TV remote controller which sends command through
   * UI navigation by pressing TV remote controller's key
   */
  function FlingPlayer(videoPlayer, connector) {
    this._player = videoPlayer;
    this._connector = connector;
  }

  var proto = FlingPlayer.prototype;

  proto.CONTROL_PANEL_HIDE_DELAY_SEC = 3000;
  proto.UPDATE_CONTROL_PANEL_INTERVAL_MS = 1000;
  proto.SEEK_ON_KEY_PRESS_INTERVAL_MS = 150;
  proto.SEEK_ON_LONG_KEY_PRESS_SEC = 5;
  proto.SEEK_ON_KEY_PRESS_NORMAL_STEP_SEC = 10;
  proto.SEEK_ON_KEY_PRESS_LARGE_STEP_SEC = 30;

  proto.init = function () {

    this._contrlPanelUpdateTimer = null;
    this._seekOnKeyPressTimer = null;
    this._seekOnKeyPressDirection = null; // 'backward' or 'forward'
    this._seekOnKeyPressStartTime = null; // in ms
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
    this._keyNav.focusOn(this._playButton);

    this._keyNavAdapter = new KeyNavigationAdapter();
    this._keyNavAdapter.init();
    this._keyNavAdapter.on('enter', this.onKeyEnterDown.bind(this));
    this._keyNavAdapter.on('enter-keyup', this.onKeyEnterUp.bind(this));
    this._keyNavAdapter.on('esc-keyup',
      this.onDemandingControlPanel.bind(this)
    );
    this._keyNavAdapter.on('move-keyup',
      this.onDemandingControlPanel.bind(this)
    );
    this._keyNavAdapter.on('enter-keyup',
      this.onDemandingControlPanel.bind(this)
    );

    document.addEventListener('visibilitychange', () => {
      // We don't need to restore the video while visibilityState goes back
      // because system app will kill the original one and relaunch a new one.
      if (document.visibilityState === 'hidden') {
        this._player.release();
      }
    });
  };

  proto._initSession = function () {
    this._connector.init();

    this._connector.on('loadRequest', this.onLoadRequest.bind(this));
    this._connector.on('playRequest', this.onPlayRequest.bind(this));
    this._connector.on('pauseRequest', this.onPauseRequest.bind(this));
    this._connector.on('seekRequest', this.onSeekRequest.bind(this));
  };

  proto._initPlayer = function () {
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

  proto.resetUI = function () {
    this.moveTimeBar('elapsed', 0);
    this.moveTimeBar('buffered', 0);
    this.writeTimeInfo('elapsed', 0);
    this.writeTimeInfo('duration', 0);
    this.setPlayButtonState('pause');
  };

  proto.showLoading = function (loading) {
    this._loadingUI.hidden = !loading;
  };

  /**
   * @param {String} state 'playing' or 'paused'
   */
  proto.setPlayButtonState = function (state) {
    // TODO: Update the button style according to the visual spec
    switch (state) {
      case 'playing':
        this._playButton.textContent = 'Pause';
      break;

      case 'paused':
        this._playButton.textContent = 'Play';
      break;
    }
  };

  proto.isControlPanelHiding = function () {
    return this._controlPanel.classList.contains('fade-out');
  };

  /**
   * @param {Boolean} autoHide? Auto hide the controls later. Default to false
   */
  proto.showControlPanel = function (autoHide) {

    if (this._hideControlsTimer) {
      clearTimeout(this._hideControlsTimer);
      this._hideControlsTimer = null;
    }

    this._keyNav.resume();
    this._controlPanel.classList.remove('fade-out');

    if (autoHide === true) {
      this.hideControlPanel();
    }
  };

  /**
   * @param {Boolean} immediate? Hide immediately or later. Default to false.
   */
  proto.hideControlPanel = function (immediate) {

    if (this._hideControlsTimer) {
      clearTimeout(this._hideControlsTimer);
      this._hideControlsTimer = null;
    }

    if (immediate === true) {

      if (!this.isControlPanelHiding()) {
        this._keyNav.pause();
        this._controlPanel.classList.add('fade-out');
      }

    } else {

      this._hideControlsTimer = setTimeout(() => {
        this.hideControlPanel(true);
      }, this.CONTROL_PANEL_HIDE_DELAY_SEC);
    }
  };

  /**
   * @param {string} type 'buffered' or 'elapsed'
   * @param {number} sec the sec in video you want to move to
   */
  proto.moveTimeBar = function (type, sec) {

    mDBG.log('FlingPlayer#moveTimeBar');
    mDBG.log('Move type ', type);
    mDBG.log('Move to ', sec);

    var timeBar = this[`_${type}TimeBar`];
    var duration = this._player.getRoundedDuration();
    sec = Math.round(sec);

    if (!timeBar ||
        typeof sec != 'number' ||
        isNaN(sec) ||
        sec < 0 ||
        sec > duration
    ) {
      mDBG.warn('Not moving due to corrupt type/sec', type, sec);
      return;
    }

    requestAnimationFrame(() => {
      mDBG.log('Move to sec / duration = %d / %d', sec, duration);
      timeBar.style.width = (100 * sec / duration) + '%';
    });
  };

  /**
   * @param {string} type 'elapsed' or 'duration'
   * @param {number} sec
   */
  proto.writeTimeInfo = function (type, sec) {

    var timeInfo = this[`_${type}Time`];
    var duration = this._player.getRoundedDuration();
    sec = Math.round(sec);

    if (!timeInfo ||
        (sec >= 0) === false ||
        (sec <= duration) === false
    ) {
      return;
    }

    var t = this._player.parseTime(sec);
    t.hh = (t.hh <= 0) ? '' :
           (t.hh < 10) ? '0' + t.hh + ':' : t.hh + ':';
    t.mm = (t.mm < 10) ? '0' + t.mm + ':' : t.mm + ':';
    t.ss = (t.ss < 10) ? '0' + t.ss : t.ss;
    timeInfo.textContent = t.hh + t.mm + t.ss;
  };

  // UI handling end

  // Video handling

  proto.play = function () {
    this._player.play();
    this.setPlayButtonState('playing');
  };

  proto.pause = function () {
    this._player.pause();
    this.setPlayButtonState('paused');
  };

  proto._startUpdateControlPanelContinuously = function () {

    if (this._contrlPanelUpdateTimer == null) {

      // To stop this is important.
      // We don't want they get messed with each other
      this._stopSeekOnKeyPress();

      this._contrlPanelUpdateTimer = setTimeout(
        this._updateControlPanelContinuously.bind(this)
      );
      this.showControlPanel(true);
    }
  };

  proto._stopUpdateControlPanelContinuously = function () {
    clearTimeout(this._contrlPanelUpdateTimer);
    this._contrlPanelUpdateTimer = null;
  };

  /**
   * This is to keep auto updating the info and status on the control panel.
   */
  proto._updateControlPanelContinuously = function () {

    if (this._contrlPanelUpdateTimer != null) {

      var buf = this._player.getVideo().buffered;
      var current = this._player.getRoundedCurrentTime();

      this.writeTimeInfo('elapsed', current);
      this.moveTimeBar('elapsed', current);

      if (buf.length) {
        this.moveTimeBar('buffered', buf.end(buf.length - 1));
      }

      this._contrlPanelUpdateTimer = setTimeout(
        this._updateControlPanelContinuously.bind(this),
        this.UPDATE_CONTROL_PANEL_INTERVAL_MS
      );
    }
  };

  proto._startSeekOnKeyPress = function (dir) {

    if (this._seekOnKeyPressStartTime == null) { // Do not double start

      // To stop this is important.
      // We don't want they get messed with each other
      this._stopUpdateControlPanelContinuously();

      this._seekOnKeyPressStartTime = (new Date()).getTime();
      this._seekOnKeyPressDirection = dir;
      this._seekOnKeyPress();
    }
  };

  proto._stopSeekOnKeyPress = function () {
    clearTimeout(this._seekOnKeyPressTimer);
    this._seekOnKeyPressDirection = null;
    this._seekOnKeyPressStartTime = null;
    this._seekOnKeyPressTimer = null;
  };

  /**
   * This is to handle this case that user seeks on video by long pressing key.
   * The seeking policy would go based on duration of pressing
   */
  proto._seekOnKeyPress = function () {

    if (this._seekOnKeyPressStartTime != null) {

      var time = this._player.getRoundedCurrentTime();
      var factor = (this._seekOnKeyPressDirection == 'backward') ? -1 : 1;
      var seekDuration = (new Date()).getTime() - this._seekOnKeyPressStartTime;
      var seekStep = (seekDuration > this.SEEK_ON_LONG_KEY_PRESS_SEC) ?
                      this.SEEK_ON_KEY_PRESS_LARGE_STEP_SEC :
                      this.SEEK_ON_KEY_PRESS_NORMAL_STEP_SEC;

      time += factor * seekStep;
      time = Math.min(Math.max(0, time), this._player.getRoundedDuration());

      this.seek(time);

      this._seekOnKeyPressTimer = setTimeout(
        this._seekOnKeyPress.bind(this),
        this.SEEK_ON_KEY_PRESS_INTERVAL_MS
      );
    }
  };

  proto.seek = function (sec) {
    this._player.seek(sec);
    this.moveTimeBar('elapsed', sec);
    this.writeTimeInfo('elapsed', sec);
    this.showControlPanel(true);
  };

  // Video handling end

  // Event handling

  proto.handleEvent = function handleVideoEvent(e) {

    mDBG.log('FlingPlayer#handleEvent: e.type = ' + e.type);

    var data = { 'time': this._player.getRoundedCurrentTime() };

    switch (e.type) {

      case 'loadedmetadata':
        this.writeTimeInfo('elapsed', this._player.getRoundedCurrentTime());
        this.writeTimeInfo('duration', this._player.getRoundedDuration());
        this._connector.reportStatus('loaded', data);
      break;

      case 'waiting':
        this.showLoading(true);
        this._connector.reportStatus('buffering', data);
      break;

      case 'playing':
        this.showLoading(false);
        // TODO: Hide 'Starting video cast from ...'
        this._connector.reportStatus('buffered', data);

        this._startUpdateControlPanelContinuously();
        this._connector.reportStatus('playing', data);
      break;

      case 'seeked':
        this._connector.reportStatus('seeked', data);
      break;

      case 'ended':
      case 'pause':
        this._stopUpdateControlPanelContinuously();
        this._connector.reportStatus('stopped', data);
        if (e.type == 'ended') {
          this.showControlPanel();
        } else {
          this.showControlPanel(true);
        }
      break;

      case 'error':
        this.showLoading(false);
        data.error = e.target.error.code;
        this._connector.reportStatus('error', data);
      break;
    }
  };

  proto.onLoadRequest = function (e) {
    this.resetUI();
    this.showLoading(true);
    // TODO: Diplay 'Starting video cast from ...'
    this._player.load(e.url);
    this.play();
  };

  proto.onPlayRequest = function () {
    this.play();
  };

  proto.onPauseRequest = function () {
    this.pause();
  };

  proto.onSeekRequest = function (e) {
    this.seek(e.time);
  };

  proto.onKeyEnterDown = function () {

    mDBG.log('FlingPlayer#onKeyEnterDown');

    if (this.isControlPanelHiding()) {
      mDBG.log('The control panel is hiding so no action is taken.');
      return;
    }

    var focused = this._keyNav.getFocusedElement();
    if (focused) {

      mDBG.log('control focused = ', focused);

      switch (focused.id) {

        case uiID.backwardButton:
        case uiID.forwardButton:
          if (focused === this._backwardButton) {
            this._startSeekOnKeyPress('backward');
          } else {
            this._startSeekOnKeyPress('forward');
          }
        break;
      }
    }
  };

  proto.onKeyEnterUp = function () {
    mDBG.log('FlingPlayer#onKeyEnterUp');

    if (this.isControlPanelHiding()) {
      mDBG.log('The control panel is hiding so no action is taken.');
      return;
    }

    var focused = this._keyNav.getFocusedElement();
    if (focused) {

      mDBG.log('control focused = ', focused);

      switch (focused.id) {

        case uiID.playButton:
          if (this._player.isPlaying()) {
            this.pause();
          } else {
            this.play();
          }
        break;

        case uiID.backwardButton:
        case uiID.forwardButton:
          this._stopSeekOnKeyPress();
        break;
      }
    }
  };

  proto.onDemandingControlPanel = function () {

    mDBG.log('FlingPlayer#onDemandingControlPanel');

    if (this.isControlPanelHiding()) {
      mDBG.log('The control panel is hiding so let it show first.');
      this.showControlPanel(true);
    }
  };

  // Event handling end

  window.addEventListener('load', function() {

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
  });

  exports.FlingPlayer = FlingPlayer;

})(window);
