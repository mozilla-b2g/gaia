/* global attentionWindowManager, System */
'use strict';

(function(exports) {
  /**
   * VisibilityManager manages visibility events and broadcast
   * to AppWindowManager.
   * When an UI layer is overlapping the current app,
   * WindowManager should set the visibility of app iframe to false
   * And reset to true when the layer is gone.
   * We may need to handle windowclosing, windowopened in the future.
   *
   * @class VisibilityManager
   * @requires attentionWindowManager
   * @requires System
   */
  var VisibilityManager = function VisibilityManager() {
    this._normalAudioChannelActive = false;
    this._deviceLockedTimer = 0;
    this.overlayEvents = [
      'cardviewshown',
      'cardviewclosed',
      'lockscreen-appopened',
      'lockscreen-request-unlock',
      'attention-inactive',
      'attentionopened',
      'mozChromeEvent',
      'appclosing',
      'homescreenopened',
      'rocketbar-overlayopened',
      'rocketbar-overlayclosed',
      'utilitytraywillshow',
      'utilitytray-tray-overlayopened',
      'utilitytray-tray-overlayclosed',
      'sheets-gesture-begin',
      'sheets-gesture-end',
      'system-dialog-show',
      'system-dialog-hide',
      'searchrequestforeground',
      'apprequestforeground',
      'lockscreen-apprequestforeground',
      'secure-apprequestforeground',
      'homescreenrequestforeground'
    ];
  };

  /**
   * Debug flag.
   * @type {Boolean}
   */
  VisibilityManager.prototype.DEBUG = false;
  VisibilityManager.prototype.CLASS_NAME = 'VisibilityManager';

  /**
   * Startup. Start listening all related events that changes visibility.
   *
   * @memberof VisibilityManager.prototype
   */
  VisibilityManager.prototype.start = function start() {
    this.overlayEvents.forEach(function overlayEventIterator(event) {
      window.addEventListener(event, this);
    }, this);
  };

  VisibilityManager.prototype.handleEvent = function vm_handleEvent(evt) {
    this.debug('handling ' + evt.type + ' event..');
    switch (evt.type) {
      case 'searchrequestforeground':
      case 'homescreenrequestforeground':
      case 'lockscreen-apprequestforeground':
      case 'secure-apprequestforeground':
        // XXX: Use hierachy manager to know who is top most.
        if (!attentionWindowManager.hasActiveWindow()) {
          evt.detail.setVisible(true);
        }
        break;
      case 'apprequestforeground':
        // XXX: Use hierachy manager to know who is top most.
        if (!System.locked &&
            !attentionWindowManager.hasActiveWindow()) {
          evt.detail.setVisible(true);
        }
        break;
      // XXX: See Bug 999318.
      // Audio channel is always normal without going back to none.
      // We are actively discard audio channel state when homescreen
      // is opened.
      case 'appclosing':
      case 'homescreenopened':
        if (window.taskManager.isShown()) {
          this.publish('hidewindowforscreenreader');
        }
        this._normalAudioChannelActive = false;
        break;
      case 'attention-inactive':
        if (window.System.locked) {
          this.publish('showlockscreenwindow');
          return;
        }
        this.publish('showwindow', { type: evt.type });
        this._resetDeviceLockedTimer();
        break;
      case 'lockscreen-request-unlock':
        var detail = evt.detail,
            activity = null,
            notificationId = null;

        if (detail) {
          activity = detail.activity;
          notificationId = detail.notificationId;
        }

        if (!attentionWindowManager.hasActiveWindow()) {
          this.publish('showwindow', {
            activity: activity,  // Trigger activity opening in AWM
            notificationId: notificationId
          });
        }
        this._resetDeviceLockedTimer();
        break;
      case 'lockscreen-appopened':
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

      case 'attentionopened':
        if (!System.locked) {
          this.publish('hidewindow', { type: evt.type });
        }
        break;
      case 'sheets-gesture-begin':
      case 'utilitytraywillshow':
      case 'rocketbar-overlayopened':
      case 'utility-tray-overlayopened':
      case 'cardviewshown':
      case 'system-dialog-show':
        this.publish('hidewindowforscreenreader');
        break;
      case 'sheets-gesture-end':
      case 'rocketbar-overlayclosed':
      case 'utility-tray-overlayclosed':
      case 'cardviewclosed':
      case 'system-dialog-hide':
        this.publish('showwindowforscreenreader');
        break;
      case 'mozChromeEvent':
        if (evt.detail.type == 'visible-audio-channel-changed') {
          this._resetDeviceLockedTimer();

          if (this._normalAudioChannelActive &&
              evt.detail.channel !== 'normal' && window.System.locked) {
            this._deviceLockedTimer = setTimeout(function setVisibility() {
              if (window.System.locked) {
                this.publish('hidewindow',
                  { screenshoting: false, type: evt.type });
              }
            }.bind(this), 3000);
          }

          this._normalAudioChannelActive = (evt.detail.channel === 'normal');
          this.debug('Normal AudioChannel changes to ',
            evt.detail.channel, this._normalAudioChannelActive);
        }
        break;
    }
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
    if (this.DEBUG) {
      console.log('[' + this.CLASS_NAME + ']' +
        '[' + System.currentTime() + ']' +
        Array.slice(arguments).concat());
    }
  };
  exports.VisibilityManager = VisibilityManager;
}(window));
