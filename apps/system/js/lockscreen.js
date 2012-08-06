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
  passCodeEnabled: false,

  /*
  * Four digit Passcode
  * XXX: should come for Settings
  */
  passCode: '0000',

  /*
  * passcode to enable the smiley face easter egg.
  */
  smileyCode: '1337',

  /*
  * Current passcode entered by the user
  */
  passCodeEntered: '',

  /*
  * Number of passcode tries
  */
  passCodeError: 0,

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

  /*
  * Airplane mode
  */
  airplaneMode: false,

  /* init */
  init: function ls_init() {
    this.getAllElements();

    this.lockIfEnabled(true);

    /* Status changes */
    window.addEventListener('volumechange', this);
    window.addEventListener('screenchange', this);

    /* Notification */
    // XXX: Move to notifications.js
    this.notification.addEventListener('click', this);
    window.addEventListener('mozChromeEvent', this);

    /* Gesture */
    this.area.addEventListener('mousedown', this);
    this.areaHandle.addEventListener('mousedown', this);
    this.areaCamera.addEventListener('mousedown', this);
    this.areaUnlock.addEventListener('mousedown', this);

    /* Unlock clean up */
    this.overlay.addEventListener('transitionend', this);

    /* Passcode input pad*/
    this.passcodePad.addEventListener('click', this);

    /* switching panels */
    window.addEventListener('home', this);

    /* mobile connection state on lock screen */
    var conn = window.navigator.mozMobileConnection;
    if (conn && conn.voice) {
      conn.addEventListener('voicechange', this);
      conn.addEventListener('cardstatechange', this);
      this.updateConnState();
      this.connstate.hidden = false;
    }

    var self = this;
    SettingsListener.observe('lockscreen.enabled', true, function(value) {
      self.setEnabled(value);
    });

    SettingsListener.observe('audio.volume.master', 5, function(volume) {
      self.mute.hidden = !!volume;
    });

    SettingsListener.observe(
      'ril.radio.disabled', false, function(value) {
      self.airplaneMode = value;
      self.updateConnState();
    });

    SettingsListener.observe(
      'lockscreen.wallpaper', 'balloon.png', function(value) {
      self.updateBackground(value);
      self.overlay.classList.remove('uninit');
    });

    SettingsListener.observe(
      'lockscreen.passcode-lock.code', '0000', function(value) {
      self.passCode = value;
    });

    SettingsListener.observe(
        'lockscreen.passcode-lock.enabled', false, function(value) {
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
      case 'screenchange':
        // XXX: If the screen is not turned off by ScreenManager
        // we would need to lock the screen again
        // when it's being turned back on
        this.lockIfEnabled(true);
        break;
      case 'voicechange':
      case 'cardstatechange':
        this.updateConnState();

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
        var handle = this.areaHandle;
        var overlay = this.overlay;
        var target = evt.target;

        this._touch = {
          target: null,
          touched: false,
          leftTarget: leftTarget,
          rightTarget: rightTarget,
          initRailLength: this.railLeft.offsetWidth,
          maxHandleOffset: rightTarget.offsetLeft - handle.offsetLeft -
            (handle.offsetWidth - rightTarget.offsetWidth) / 2
        };
        window.addEventListener('mouseup', this);
        window.addEventListener('mousemove', this);

        switch (target) {
          case leftTarget:
            overlay.classList.add('touched-left');
            break;

          case rightTarget:
            overlay.classList.add('touched-right');
            break;

          case this.areaHandle:
            this._touch.touched = true;
            this._touch.initX = evt.pageX;
            this._touch.initY = evt.pageY;

            overlay.classList.add('touched');
            break;
        }
        break;

      case 'mousemove':
        this.handleMove(evt.pageX, evt.pageY);
        break;

      case 'mouseup':
        var handle = this.areaHandle;
        window.removeEventListener('mousemove', this);
        window.removeEventListener('mouseup', this);

        this.overlay.classList.remove('touched-left');
        this.overlay.classList.remove('touched-right');

        this.handleMove(evt.pageX, evt.pageY);
        this.handleGesture();
        delete this._touch;
        this.overlay.classList.remove('touched');

        break;

      case 'transitionend':
        if (evt.target !== this.overlay)
          return;

        if (!this.locked) {
          this.switchPanel();
          this.overlay.hidden = true;
        }
        break;

      case 'home':
        if (this.locked) {
          this.switchPanel();
          evt.stopImmediatePropagation();
        }
        break;
    }
  },

  handleMove: function ls_handleMove(pageX, pageY) {
    var touch = this._touch;

    if (!touch.touched) {
      // Do nothing if the user have not move the finger to the handle yet
      if (document.elementFromPoint(pageX, pageY) !== this.areaHandle)
        return;

      touch.touched = true;
      touch.initX = pageX;
      touch.initY = pageY;

      var overlay = this.overlay;
      overlay.classList.remove('touched-left');
      overlay.classList.remove('touched-right');
      overlay.classList.add('touched');
    }

    var dx = pageX - touch.initX;

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

        var panelOrFullApp = function panelOrFullApp() {
          if (self.passCodeEnabled) {
            // Go to secure camera panel
            self.switchPanel('camera');
            return;
          }

          self.unlock();

          var a = new MozActivity({
            name: 'record',
            data: {
              type: 'photos'
            }
          });
          a.onerror = function ls_activityError() {
            console.log('MozActivity: camera launch error.');
          }
        };


        if (this.areaHandle.style.MozTransform == transition) {
          panelOrFullApp();
          break;
        }
        this.areaHandle.style.MozTransform = transition;

        this.areaHandle.addEventListener('transitionend', function goCamera() {
          self.areaHandle.removeEventListener('transitionend', goCamera);
          panelOrFullApp();
        });
        break;

      case this.areaUnlock:
        this.railLeft.style.width = railLength + 'px';
        this.railRight.style.width = '0';

        var passcodeOrUnlock = function passcodeOrUnlock() {
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

        this.areaHandle.addEventListener('transitionend', function goUnlock() {
          self.areaHandle.removeEventListener('transitionend', goUnlock);
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
      this.switchPanel();
      this.overlay.hidden = true;
    } else {
      this.overlay.classList.remove('no-transition');
    }

    this.mainScreen.classList.remove('locked');

    WindowManager.setOrientationForApp(WindowManager.getDisplayedApp());

    if (!wasAlreadyUnlocked) {
      this.dispatchEvent('unlock');
      this.writeSetting(false);
      this.hideNotification();
    }
  },

  lock: function ls_lock(instant) {
    var wasAlreadyLocked = this.locked;
    this.locked = true;
    this.overlay.hidden = false;

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
      this.dispatchEvent('lock');
      this.writeSetting(true);
    }
  },

  loadPanel: function ls_loadPanel(panel, callback) {
    switch (panel) {
      case 'passcode':
      case 'emergency':
      default:
        if (callback)
          callback();
        break;

      case 'camera':
        // create the <iframe> and load the camera
        var frame = document.createElement('iframe');

        frame.src = './camera/';
        var mainScreen = this.mainScreen;
        frame.onload = function cameraLoaded() {
          mainScreen.classList.add('lockscreen-camera');
          callback();
        };
        this.overlay.classList.remove('no-transition');
        this.camera.hidden = false;
        this.camera.appendChild(frame);

        break;
    }
  },

  unloadPanel: function ls_loadPanel(panel, toPanel, callback) {
    switch (panel) {
      case 'passcode':
        // Reset passcode panel only if the status is not error
        if (this.overlay.dataset.passcodeStatus == 'error')
          break;

        delete this.overlay.dataset.passcodeStatus;
        this.passCodeEntered = '';
        this.updatePassCodeUI();
        break;

      case 'camera':
        var self = this;
        this.overlay.addEventListener('transitionend',
          function ls_unloadCamera() {
            self.overlay.removeEventListener('transitionend',
                                             ls_unloadCamera);

            // Remove the iframe element
            self.mainScreen.classList.remove('lockscreen-camera');
            self.camera.hidden = true;
            self.camera.removeChild(this.camera.firstElementChild);
          });
        break;

      case 'emergency':
        break;

      default:
        var self = this;
        var unload = function unload() {
          self.areaHandle.style.MozTransform =
            self.areaUnlock.style.opacity =
            self.railRight.style.opacity =
            self.areaCamera.style.opacity =
            self.railLeft.style.opacity =
            self.railRight.style.width =
            self.railLeft.style.width = '';
          self.areaHandle.classList.remove('triggered');
          self.areaCamera.classList.remove('triggered');
          self.areaUnlock.classList.remove('triggered');
        };

        if (toPanel !== 'camera') {
          unload();
          break;
        }

        this.overlay.addEventListener('transitionend',
          function ls_unloadDefaultPanel() {
            self.overlay.removeEventListener('transitionend',
                                             ls_unloadDefaultPanel);
            unload();
          }
        );

        break;
    }

    if (callback)
      callback();
  },

  switchPanel: function ls_switchPanel(panel) {
    var overlay = this.overlay;
    var self = this;
    panel = panel || '';
    this.loadPanel(panel, function panelLoaded() {
      self.unloadPanel(overlay.dataset.panel, panel,
        function panelUnloaded() {
          overlay.dataset.panel = panel;
        });
    });
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

  updateConnState: function ls_updateConnState() {
    var conn = window.navigator.mozMobileConnection;
    var voice = conn.voice;
    var connstate = this.connstate;
    var _ = navigator.mozL10n.get;

    if (this.airplaneMode) {
      connstate.dataset.l10nId = 'airplaneMode';
      connstate.textContent = _('airplaneMode') || '';

      return;
    }

    if (!voice.connected && !voice.emergencyCallsOnly) {
      // "No Network" / "Searching"
      // XXX: need differentiate the two
      // https://github.com/mozilla-b2g/gaia/issues/2763
      connstate.dataset.l10nId = 'searching';
      connstate.textContent = _('searching') || '';

      return;
    }

    if (voice.emergencyCallsOnly) {
      switch (conn.cardState) {
        case 'absent':
          connstate.dataset.l10nId = 'emergencyCallsOnlyNoSIM';
          connstate.textContent = _('emergencyCallsOnlyNoSIM') || '';

          break;

        case 'pinRequired':
          connstate.dataset.l10nId = 'emergencyCallsOnlyPinRequired';
          connstate.textContent = _('emergencyCallsOnlyPinRequired') || '';

          break;

        case 'pukRequired':
          connstate.dataset.l10nId = 'emergencyCallsOnlyPukRequired';
          connstate.textContent = _('emergencyCallsOnlyPukRequired') || '';

          break;

        case 'networkLocked':
          connstate.dataset.l10nId = 'emergencyCallsOnlyNetworkLocked';
          connstate.textContent = _('emergencyCallsOnlyNetworkLocked') || '';

          break;

        default:
          connstate.dataset.l10nId = 'emergencyCallsOnly';
          connstate.textContent = _('emergencyCallsOnly') || '';

          break;
      }

      return;
    }

    if (voice.roaming) {
      var l10nArgs = { operator: voice.network.shortName };
      connstate.dataset.l10nId = 'roaming';
      connstate.dataset.l10nArgs = JSON.stringify(l10nArgs);
      connstate.textContent = _('roaming', l10nArgs);

      return;
    }

    delete connstate.dataset.l10nId;
    connstate.textContent = voice.network.shortName;
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
    if (this.passCodeEntered === this.smileyCode)
      this.overlay.classList.add('smiley');

    if (this.passCodeEntered === this.passCode) {
      this.overlay.dataset.passcodeStatus = 'success';
      this.passCodeError = 0;

      this.unlock();
    } else {
      this.overlay.dataset.passcodeStatus = 'error';
      if ('vibrate' in navigator)
        navigator.vibrate([50, 50, 50]);

      var timeout = this.kPassCodeErrorTimeout;
      this.passCodeError++;
      if (this.passCodeError >= 3)
        timeout = this.kPassCodeTriesTimeout;

      var self = this;
      setTimeout(function error() {
        delete self.overlay.dataset.passcodeStatus;
        self.passCodeEntered = '';
        self.updatePassCodeUI();
      }, timeout);
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
    var elements = ['connstate', 'mute', 'clock', 'date',
        'notification', 'notification-icon', 'notification-title',
        'notification-detail', 'notification-time',
        'area', 'area-unlock', 'area-camera', 'area-handle',
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
  },

  dispatchEvent: function ls_dispatchEvent(name) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(name, true, true, null);
    window.dispatchEvent(evt);
  },

  writeSetting: function ls_writeSetting(value) {
    var settings = window.navigator.mozSettings;
    if (!settings)
      return;

    settings.getLock().set({
      'lockscreen.locked': value
    });
  }
};

LockScreen.init();
