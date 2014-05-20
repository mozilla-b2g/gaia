/* global AttentionScreen, System */
'use strict';

(function(exports) {
  var DEBUG = false;
  /**
   * VisibilityManager manages visibility events and broadcast
   * to AppWindowManager.
   * When an UI layer is overlapping the current app,
   * WindowManager should set the visibility of app iframe to false
   * And reset to true when the layer is gone.
   * We may need to handle windowclosing, windowopened in the future.
   *
   * @class VisibilityManager
   * @requires AttentionScreen
   * @requires System
   */
  var VisibilityManager = function VisibilityManager() {
    this._attentionScreenTimer = null;
    this._normalAudioChannelActive = false;
    this._deviceLockedTimer = 0;
    this.overlayEvents = [
      'lock',
      'will-unlock',
      'attentionscreenshow',
      'attentionscreenhide',
      'status-active',
      'status-inactive',
      'mozChromeEvent',
      'appclosing',
      'homescreenopening',
      'rocketbar-overlayopened',
      'rocketbar-overlayclosed',
      'utility-tray-overlayopened',
      'utility-tray-overlayclosed'
    ];
  };

  /**
   * Startup. Start listening all related events that changes visibility.
   *
   * @memberof VisibilityManager.prototype
   */
  VisibilityManager.prototype.start = function start() {
    this.overlayEvents.forEach(function overlayEventIterator(event) {
      window.addEventListener(event, this);
    }, this);
    return this;
  };

  VisibilityManager.prototype.handleEvent = function vm_handleEvent(evt) {
    if (this._attentionScreenTimer && 'mozChromeEvent' != evt.type) {
      clearTimeout(this._attentionScreenTimer);
    }
    switch (evt.type) {
      // XXX: See Bug 999318.
      // Audio channel is always normal without going back to none.
      // We are actively discard audio channel state when homescreen
      // is opened.
      case 'appclosing':
      case 'homescreenopening':
        this._normalAudioChannelActive = false;
        break;
      case 'status-active':
      case 'attentionscreenhide':
      case 'will-unlock':
        if (!AttentionScreen.isFullyVisible()) {
          this.publish('showwindow', { type: evt.type });
        }
        this._resetDeviceLockedTimer();
        break;
      case 'lock':
        // If the audio is active, the app should not set non-visible
        // otherwise it will be muted.
        // TODO: Remove this hack.
        this.debug('locking, hide the whole windows',
          this._normalAudioChannelActive);
        if (!this._normalAudioChannelActive) {
          this.publish('hidewindow',
            { screenshoting: false, type: evt.type });
        }
        this._resetDeviceLockedTimer();
        break;


      case 'status-inactive':
        if (!AttentionScreen.isVisible()) {
          return;
        }
        this._setAttentionScreenVisibility(evt);
        break;
      case 'attentionscreenshow':
        this._setAttentionScreenVisibility(evt);
        break;
      case 'rocketbar-overlayopened':
      case 'utility-tray-overlayopened':
        this.publish('hidewindowforscreenreader');
        break;
      case 'rocketbar-overlayclosed':
      case 'utility-tray-overlayclosed':
        this.publish('showwindowforscreenreader');
        break;
      case 'mozChromeEvent':
        if (evt.detail.type == 'visible-audio-channel-changed') {
          this._resetDeviceLockedTimer();

          if (this._normalAudioChannelActive &&
              evt.detail.channel !== 'normal' &&
              window.System.locked) {
            this._deviceLockedTimer = setTimeout(function setVisibility() {
              this.publish('hidewindow',
                { screenshoting: false, type: evt.type });
            }.bind(this), 3000);
          }

          this._normalAudioChannelActive = (evt.detail.channel === 'normal');
          this.debug('Normal AudioChannel changes to ',
            evt.detail.channel, this._normalAudioChannelActive);
        }
        break;
    }
  };

  /*
  * Because in-transition is needed in attention screen,
  * We set a timer here to deal with visibility change
  */
  VisibilityManager.prototype._setAttentionScreenVisibility =
    function vm_setAttentionScreenVisibility(evt) {
      var detail = evt.detail;
      this._attentionScreenTimer = setTimeout(function setVisibility() {
        this.publish('hidewindow',
          { screenshoting: true, type: evt.type, origin: detail.origin });
      }.bind(this), 3000);
      this.publish('overlaystart');
    };

  VisibilityManager.prototype._resetDeviceLockedTimer =
    function vm_resetDeviceLockedTimer() {
      if (this._deviceLockedTimer) {
        clearTimeout(this._deviceLockedTimer);
        this._deviceLockedTimer = 0;
      }
    };

  VisibilityManager.prototype.publish = function vm_publish(eventName, detail) {
    this.debug('publishing: ', eventName);
    var evt = new CustomEvent(eventName, { detail: detail });
    window.dispatchEvent(evt);
  };

  VisibilityManager.prototype.debug = function vm_debug() {
    if (DEBUG) {
      console.log('[VisibilityManager]' +
        '[' + System.currentTime() + ']' +
        Array.slice(arguments).concat());
    }
  };
  exports.VisibilityManager = VisibilityManager;
}(window));
