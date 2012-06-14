/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var LockScreen = {
  /*
  * Boolean return the status of the lock screen.
  * Must not multate directly - use unlock()/lockIfEnabled()
  * Listen to 'lock' and 'unlock' event to properly handle status changes
  */
  locked: true,

  /*
  * Boolean return whether if the lock screen is enabled or not.
  * Must not multate directly - use setEnabled(val)
  * Only Settings Listener should change this value to sync with data
  * in Settings API.
  */
  enabled: true,

  /*
  * Boolean return whether if the lock screen is enabled or not.
  * Must not multate directly - use setPassCodeEnabled(val)
  * Only Settings Listener should change this value to sync with data
  * in Settings API.
  * Will be ignored if 'enabled' is set to false.
  */
  passCodeEnabled: true,

  /*
  * Four digit Passcode
  * XXX: should come for Settings
  */
  passCode: '0000',

  /*
  * Current passcode entered by the user
  */
  passCodeEntered: '',

  /*
  * Number of passcode tries
  */
  passCodeError: 0,

  /*
  * Time to wait before slide up after successful Passcode input
  */
  kPassCodeSuccessTimeout: 300,

  /*
  * Timeout after incorrect attempt
  */
  kPassCodeErrorTimeout: 500,

  /*
  * Number of attempts allowed
  */
  kPassCodeTries: 3,

  /*
  * Cool down period after kPassCodeTries
  */
  kPassCodeTriesTimeout: 10000,

  isUninit: true,

  /* init */
  init: function ls_init() {
    if (!this.isUninit)
      return;
    this.isUninit = false;

    this.getAllElements();
    this.updateMuteState();

    this.lockIfEnabled(true);
    this.overlay.classList.remove('uninit');

    /* Status changes */
    window.addEventListener('volumechange', this);
    window.addEventListener('screenchange', this);

    /* Notification */
    this.notification.addEventListener('click', this);
    window.addEventListener('mozChromeEvent', this);

    /* Gesture */
    this.areaStart.addEventListener('mousedown', this);
    window.addEventListener('mouseup', this);

    /* Passcode input pad*/
    this.passcodePad.addEventListener('click', this);

    /* Camera app frame load/unload */
    this.camera.addEventListener('load', this);
    this.camera.addEventListener('unload', this);

    /* switching panels */
    window.addEventListener('keyup', this);

    var self = this;

    SettingsListener.observe('lockscreen.enabled', true, function(value) {
      if (typeof value === 'string')
        value = (value == 'true');

      self.setEnabled(value);
    });

    SettingsListener.observe(
        'lockscreen.passcode-lock.enabled', true, function(value) {
      if (typeof value === 'string')
        value = (value == 'true');

      self.setPassCodeEnabled(value);
    });
  },

  /*
  * Set enabled state.
  * If enabled state is somehow updated when the lock screen is enabled
  * This function will unlock it.
  */
  setEnabled: function ls_setEnabled(val) {
    if (typeof val === 'string') {
      this.enabled = val == 'false' ? false : true;
    } else {
      this.enabled = val;
    }

    if (!this.enabled && this.locked && !this.isUninit) {
      this.unlock();
    }
  },

  setPassCodeEnabled: function ls_setPassCodeEnabled(val) {
    if (typeof val === 'string') {
      this.passCodeEnabled = val == 'false' ? false : true;
    } else {
      this.passCodeEnabled = val;
    }
  },

  handleEvent: function ls_handleEvent(evt) {
    switch (evt.type) {
      case 'volumechange':
        this.updateMuteState();
        break;

      case 'screenchange':
        // XXX: If the screen is not turned off by ScreenManager
        // we would need to lock the screen again
        // when it's being turned back on
        this.lockIfEnabled(true);
        break;

      case 'mozChromeEvent':
        if (!this.locked || evt.detail.type !== 'desktop-notification')
          return;

        this.showNotification(evt.detail);
        break;

      case 'click':
        switch (evt.currentTarget) {
          case this.notification:
            this.hideNotification();
            break;
          case this.passcodePad:
            if (!evt.target.dataset.key)
              break;

            // Cancel the default action of <a>
            evt.preventDefault();
            this.handlePassCodeInput(evt.target.dataset.key);

            break;
        }
        break;

      case 'mousedown':
        this._touch = {
          x: evt.screenX,
          y: evt.screenY
        };
        this.overlay.classList.add('touch');
        break;

      case 'mouseup':
        if (!this._touch)
          return;
        var dx = evt.screenX - this._touch.x;
        var dy = evt.screenY - this._touch.y;
        delete this._touch;
        this.overlay.classList.remove('touch');

        this.handleGesture(dx, dy);
        break;

      case 'keyup':
        if (!this.locked || evt.keyCode !== evt.DOM_VK_ESCAPE ||
            evt.keyCode !== evt.DOM_VK_HOME)
          break;

        this.switchPanel();
        break;

      case 'load':
        this.camera.contentWindow.addEventListener(
          'keydown', (this.redirectKeyEventFromFrame).bind(this));
        this.camera.contentWindow.addEventListener(
          'keypress', (this.redirectKeyEventFromFrame).bind(this));
        this.camera.contentWindow.addEventListener(
          'keyup', (this.redirectKeyEventFromFrame).bind(this));
        break;

      case 'unload':
        this.camera.contentWindow.removeEventListener(
          'keydown', (this.redirectKeyEventFromFrame).bind(this));
        this.camera.contentWindow.removeEventListener(
          'keypress', (this.redirectKeyEventFromFrame).bind(this));
        this.camera.contentWindow.removeEventListener(
          'keyup', (this.redirectKeyEventFromFrame).bind(this));
        break;
    }
  },

  handleGesture: function ls_handleGesture(dx, dy) {
    var dim = {
      x: this.overlay.offsetWidth,
      y: this.overlay.offsetHeight
    };

    // These are gesture rule with camera gesture

    var ratioX = dx / this.overlay.offsetWidth;
    var ratioY = dy / this.overlay.offsetHeight;

    if (Math.abs(ratioY) > 0.2) {
      // Go upwards - do nothing
      return;
    }

    if (ratioX > 0.2) {
      this.switchPanel('camera');
    } else if (ratioX < -0.2) {
      // Moving left to unlock icon
      if (!this.passCodeEnabled) {
        this.unlock();
      } else {
        this.switchPanel('passcode');
      }
    }
  },

  handlePassCodeInput: function ls_handlePassCodeInput(key) {
    switch (key) {
      case 'e': // Emergency Call
        this.switchPanel('emergency-call');
        break;
      case 'b':
        if (!this.passCodeEntered) {
          this.switchPanel();
          break;
        }

        this.passCodeEntered =
          this.passCodeEntered.substr(0, this.passCodeEntered.length - 1);
        this.updatePassCodeUI();

        break;
      default:
        this.passCodeEntered += key;
        this.updatePassCodeUI();

        if (this.passCodeEntered.length === 4)
          this.checkPassCode();
        break;
    }
  },

  lockIfEnabled: function ls_lockIfEnabled(instant) {
    if (this.enabled) {
      this.lock(instant);
    } else {
      this.unlock(instant);
    }
  },

  unlock: function ls_unlock(instant) {
    var wasAlreadyUnlocked = !this.locked;
    this.locked = false;

    this.mainScreen.focus();
    this.overlay.classList.add('unlocked');
    if (instant)
      this.overlay.classList.add('no-transition');
    else
      this.overlay.classList.remove('no-transition');

    this.mainScreen.classList.remove('locked');

    WindowManager.setOrientationForApp(WindowManager.getDisplayedApp());

    if (!wasAlreadyUnlocked) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('unlocked', true, true, null);
      window.dispatchEvent(evt);

      this.hideNotification();
    }
  },

  lock: function ls_lock(instant) {
    var wasAlreadyLocked = this.locked;
    this.locked = true;

    this.switchPanel();

    this.overlay.focus();
    this.overlay.classList.remove('unlocked');
    if (instant)
      this.overlay.classList.add('no-transition');
    else
      this.overlay.classList.remove('no-transition');

    this.mainScreen.classList.add('locked');

    screen.mozLockOrientation('portrait-primary');

    this.updateTime();

    if (!wasAlreadyLocked) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('locked', true, true, null);
      window.dispatchEvent(evt);
    }
  },

  loadPanel: function ls_loadPanel(panel) {
    switch (panel) {
      case 'passcode':
        break;

      case 'camera':
        // load the camera iframe
        this.camera.src = './camera/';
        break;

      case 'emergency':
        break;
    }
  },

  unloadPanel: function ls_loadPanel(panel) {
    switch (panel) {
      case 'passcode':
        // Reset passcode panel
        this.passCodeEntered = '';
        this.updatePassCodeUI();
        break;

      case 'camera':
        // unload the camera iframe
        this.camera.src = './blank.html';
        break;

      case 'emergency':
        break;
    }
  },

  switchPanel: function ls_switchPanel(panel) {
    var overlay = this.overlay;
    if (('panel' in overlay.dataset) && panel == overlay.dataset.panel)
      return;

    if ('panel' in overlay.dataset) {
      this.unloadPanel(overlay.dataset.panel);
    }

    if (panel) {
      overlay.dataset.panel = panel;
      this.loadPanel(panel);
    } else {
      delete overlay.dataset.panel;
    }
  },

  updateTime: function ls_updateTime() {
    if (!this.locked)
      return;

    var d = new Date();

    // XXX: respect clock format in Settings
    this.clock.textContent = d.toLocaleFormat('%R');

    this.calDay.textContent = d.toLocaleFormat('%a');
    this.calDate.textContent = d.getDate();

    var self = this;
    window.setTimeout(function ls_clockTimeout() {
      self.updateTime();
    }, (59 - d.getSeconds()) * 1000);
  },

  updateMuteState: function ls_updateMuteState() {
    this.mute.hidden = !!SoundManager.currentVolume;
  },

  showNotification: function lockscreen_showNotification(detail) {
    this.notification.hidden = false;

    // XXX: pretty date, respect clock format in Settings
    this.notificationTime.textContent = (new Date()).toLocaleFormat('%R');
    this.notificationIcon.src = detail.icon;
    this.notificationTitle.textContent = detail.title;
    this.notificationDetail.textContent = detail.text;
  },

  hideNotification: function lockscreen_hideNotification() {
    this.notification.hidden = true;
    this.notificationTime.textContent = '';
    this.notificationTitle.textContent = '';
    this.notificationDetail.textContent = '';
  },

  updatePassCodeUI: function lockscreen_updatePassCodeUI() {
    var i = 4;
    while (i--) {
      var span = this.passcodeCode.childNodes[i];
      if (this.passCodeEntered.length > i)
        span.dataset.dot = true;
      else
        delete span.dataset.dot;
    }
  },

  checkPassCode: function lockscreen_checkPassCode() {
    if (this.passCodeEntered === this.passCode) {
      this.overlay.dataset.passcodeStatus = 'success';
      this.passCodeError = 0;

      setTimeout((function success() {
        delete this.overlay.dataset.passcodeStatus;
        this.unlock();
        this.passCodeEntered = '';
        this.updatePassCodeUI();
      }).bind(this), this.kPassCodeSuccessTimeout);
    } else {
      this.overlay.dataset.passcodeStatus = 'error';
      if (navigator.mozVibrate)
        navigator.mozVibrate([50, 50, 50]);

      var timeout = this.kPassCodeErrorTimeout;
      this.passCodeError++;
      if (this.passCodeError >= 3)
        timeout = this.kPassCodeTriesTimeout;

      setTimeout((function error() {
        delete this.overlay.dataset.passcodeStatus;
        this.passCodeEntered = '';
        this.updatePassCodeUI();
      }).bind(this), timeout);
    }
  },

  getAllElements: function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['mute', 'clock', 'cal-day', 'cal-date',
        'notification', 'notification-icon', 'notification-title',
        'notification-detail', 'notification-time',
        'area-unlock', 'area-start', 'area-camera',
        'passcode-code', 'passcode-pad',
        'camera'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    }

    elements.forEach((function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById('lockscreen-' + name);
    }).bind(this));

    this.overlay = document.getElementById('lockscreen');
    this.mainScreen = document.getElementById('screen');
  },

  redirectKeyEventFromFrame: function ls_redirectKeyEventFromFrame(evt) {
    var generatedEvent = document.createEvent('KeyboardEvent');
    generatedEvent.initKeyEvent(evt.type, true, true, evt.view, evt.ctrlKey,
                                evt.altKey, evt.shiftKey, evt.metaKey,
                                evt.keyCode, evt.charCode);

    this.camera.dispatchEvent(generatedEvent);
  }
};
