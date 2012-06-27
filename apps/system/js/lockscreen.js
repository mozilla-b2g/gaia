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

  /* init */
  init: function ls_init() {
    this.getAllElements();
    this.updateMuteState();

    this.lockIfEnabled(true);

    /* Status changes */
    window.addEventListener('volumechange', this);
    window.addEventListener('screenchange', this);

    /* Notification */
    // XXX: Move to notifications.js
    this.notification.addEventListener('click', this);
    window.addEventListener('mozChromeEvent', this);

    /* Gesture */
    this.areaHandle.addEventListener('mousedown', this);

    /* Unlock clean up */
    this.overlay.addEventListener('transitionend', this);

    /* Passcode input pad*/
    this.passcodePad.addEventListener('click', this);

    /* Camera app frame load/unload */
    this.camera.addEventListener('load', this);
    this.camera.addEventListener('unload', this);

    /* switching panels */
    window.addEventListener('keyup', this, true);

    var self = this;

    SettingsListener.observe('lockscreen.enabled', true, function(value) {
      if (typeof value === 'string')
        value = (value == 'true');

      self.setEnabled(value);
    });

    SettingsListener.observe(
      'lockscreen.wallpaper', 'balloon.png', function(value) {
      self.updateBackground(value);
      self.overlay.classList.remove('uninit');
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

    if (!this.enabled && this.locked) {
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
        var leftTarget = this.areaCamera;
        var rightTarget = this.areaUnlock;

        this._touch = {
          initX: evt.screenX,
          initY: evt.screenY,
          target: null,
          leftTarget: leftTarget,
          rightTarget: rightTarget,
          initRailLength: this.railLeft.offsetWidth,
          maxHandleOffset: rightTarget.offsetLeft -
            this.areaHandle.offsetLeft -
            (this.areaHandle.offsetWidth - rightTarget.offsetWidth) / 2
        };
        this.overlay.classList.add('touched');
        window.addEventListener('mouseup', this);
        window.addEventListener('mousemove', this);
        break;

      case 'mousemove':
        this.handleMove(evt.screenX, evt.screenY);
        break;

      case 'mouseup':

        this.handleMove(evt.screenX, evt.screenY);
        this.handleGesture();
        delete this._touch;
        this.overlay.classList.remove('touched');

        window.removeEventListener('mousemove', this);
        window.removeEventListener('mouseup', this);
        break;

      case 'transitionend':
        if (evt.currentTarget !== evt.target)
          return;

        if (!this.locked)
          this.switchPanel();

      case 'keyup':
        if (!this.locked)
          break;

        if (evt.keyCode !== evt.DOM_VK_ESCAPE &&
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

  handleMove: function ls_handleMove(screenX, screenY) {
    var touch = this._touch;
    var dx = screenX - touch.initX;

    var handleMax = touch.maxHandleOffset;
    this.areaHandle.style.MozTransition = 'none';
    this.areaHandle.style.MozTransform =
      'translateX(' + Math.max(- handleMax, Math.min(handleMax, dx)) + 'px)';

    var railMax = touch.initRailLength;
    var railLeft = railMax + dx;
    var railRight = railMax - dx;

    this.railLeft.style.width =
      Math.max(0, Math.min(railMax * 2, railLeft)) + 'px';
    this.railRight.style.width =
      Math.max(0, Math.min(railMax * 2, railRight)) + 'px';

    var base = this.overlay.offsetWidth / 4;
    var opacity = Math.max(0.1, (base - Math.abs(dx)) / base);
    if (dx > 0) {
      touch.rightTarget.style.opacity =
        this.railRight.style.opacity = '';
      touch.leftTarget.style.opacity =
        this.railLeft.style.opacity = opacity;
    } else {
      touch.rightTarget.style.opacity =
        this.railRight.style.opacity = opacity;
      touch.leftTarget.style.opacity =
        this.railLeft.style.opacity = '';
    }

    var handleWidth = this.areaHandle.offsetWidth;

    if (railLeft < handleWidth / 2) {
      touch.leftTarget.classList.add('triggered');
      touch.rightTarget.classList.remove('triggered');
      touch.target = touch.leftTarget;
    } else if (railRight < handleWidth / 2) {
      touch.leftTarget.classList.remove('triggered');
      touch.rightTarget.classList.add('triggered');
      touch.target = touch.rightTarget;
    } else {
      touch.leftTarget.classList.remove('triggered');
      touch.rightTarget.classList.remove('triggered');
      touch.target = null;
    }
  },

  handleGesture: function ls_handleGesture() {
    var touch = this._touch;
    var target = touch.target;
    this.areaHandle.style.MozTransition = null;

    if (!target) {
      this.unloadPanel();
      return;
    }

    var distance = target.offsetLeft - this.areaHandle.offsetLeft -
      (this.areaHandle.offsetWidth - target.offsetWidth) / 2;
    this.areaHandle.classList.add('triggered');

    var transition = 'translateX(' + distance + 'px)';
    var railLength = touch.rightTarget.offsetLeft -
      touch.leftTarget.offsetLeft -
      (this.areaHandle.offsetWidth + target.offsetWidth) / 2;
    var self = this;

    switch (target) {
      case this.areaCamera:
        this.railRight.style.width = railLength + 'px';
        this.railLeft.style.width = '0';
        if (this.areaHandle.style.MozTransform == transition) {
          self.switchPanel('camera');
          break;
        }
        this.areaHandle.style.MozTransform = transition;
        this.areaHandle.addEventListener('transitionend',
          function ls_goCamera() {
            self.areaHandle.removeEventListener('transitionend', ls_goCamera);
            self.switchPanel('camera');
          });

        break;

      case this.areaUnlock:
        this.railLeft.style.width = railLength + 'px';
        this.railRight.style.width = '0';
        var passcodeOrUnlock = function lc_passcodeOrUnlock() {
          if (!self.passCodeEnabled) {
            self.unlock();
          } else {
            self.switchPanel('passcode');
          }
        };
        if (this.areaHandle.style.MozTransform == transition) {
          passcodeOrUnlock();
          break;
        }
        this.areaHandle.style.MozTransform = transition;
        this.areaHandle.addEventListener('transitionend',
          function ls_goUnlock() {
            self.areaHandle.removeEventListener('transitionend', ls_goUnlock);
            passcodeOrUnlock();
          });

        break;
    }
  },

  handlePassCodeInput: function ls_handlePassCodeInput(key) {
    switch (key) {
      case 'e': // Emergency Call
        this.switchPanel('emergency-call');
        break;

      case 'c':
        this.switchPanel();
        break;

      case 'b':
        if (this.overlay.dataset.passcodeStatus)
          return;

        this.passCodeEntered =
          this.passCodeEntered.substr(0, this.passCodeEntered.length - 1);
        this.updatePassCodeUI();

        break;
      default:
        if (this.overlay.dataset.passcodeStatus)
          return;

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
    if (instant) {
      this.overlay.classList.add('no-transition');
      this.unloadPanel();
    } else {
      this.overlay.classList.remove('no-transition');
    }

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

      default:
        this.areaHandle.style.MozTransform =
          this.areaUnlock.style.opacity =
          this.railRight.style.opacity =
          this.areaCamera.style.opacity =
          this.railLeft.style.opacity =
          this.railRight.style.width =
          this.railLeft.style.width = '';
        this.areaHandle.classList.remove('triggered');
        this.areaCamera.classList.remove('triggered');
        this.areaUnlock.classList.remove('triggered');
        break;
    }
  },

  switchPanel: function ls_switchPanel(panel) {
    var overlay = this.overlay;
    if (('panel' in overlay.dataset) && panel == overlay.dataset.panel)
      return;

    this.unloadPanel(overlay.dataset.panel);

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

    this.date.textContent = d.toLocaleFormat('%A %e %B');

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
    var overlay = this.overlay;
    if (overlay.dataset.passcodeStatus)
      return;
    if (this.passCodeEntered) {
      overlay.classList.add('passcode-entered');
    } else {
      overlay.classList.remove('passcode-entered');
    }
    var i = 4;
    while (i--) {
      var span = this.passcodeCode.childNodes[i];
      if (this.passCodeEntered.length > i) {
        span.dataset.dot = true;
      } else {
        delete span.dataset.dot;
      }
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

  updateBackground: function ls_updateBackground(value) {
    var panels = document.querySelectorAll('.lockscreen-panel');
    var url = 'url(resources/images/backgrounds/' + value + ')';

    for (var i = 0; i < panels.length; i++) {
      panels[i].style.backgroundImage = url;
    }
  },

  getAllElements: function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['mute', 'clock', 'date',
        'notification', 'notification-icon', 'notification-title',
        'notification-detail', 'notification-time',
        'area-unlock', 'area-camera', 'area-handle',
        'rail-left', 'rail-right',
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

LockScreen.init();
