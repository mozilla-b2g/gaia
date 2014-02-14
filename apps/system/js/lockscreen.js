/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * LockScreen now use strategy pattern to adapt the unlocker, which would
 * report intentions like unlocking and launching camera to finish the job.
 *
 * @see intentionRouter in the component.
 */
(function(exports) {

  var LockScreen = function() {
    this.init();
  };
  LockScreen.prototype = {
    configs: {
      mode: 'default'
    },
    // The unlocking strategy.
    _unlocker: null,
    _unlockerInitialized: false,

    /*
    * Lockscreen connection information manager
    */
    _lockscreenConnInfoManager: null,

    /*
    * Boolean return true when initialized.
    */
    ready: false,

    /*
    * Boolean return the status of the lock screen.
    * Must not multate directly - use unlock()/lockIfEnabled()
    * Listen to 'lock' and 'unlock' event to properly handle status changes
    */
    _locked: true,

    /*
    * Boolean return whether if the lock screen is enabled or not.
    * Must not multate directly - use setEnabled(val)
    * Only Settings Listener should change this value to sync with data
    * in Settings API.
    */
    enabled: true,

    /*
    * Boolean returns wether we want a sound effect when unlocking.
    */
    unlockSoundEnabled: false,

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
    * The time to request for passcode input since device is off.
    */
    passCodeRequestTimeout: 0,

    /*
    * Store the first time the screen went off since unlocking.
    */
    _screenOffTime: 0,

    /*
    * Check the timeout of passcode lock
    */
    _passCodeTimeoutCheck: false,

    /*
    * If user is sliding.
    */
    _sliding: false,

    /*
    * If user had released the finger and the handle already
    * reached one of the ends.
    */
    _slideReachEnd: false,

    /*
    * Current passcode entered by the user
    */
    passCodeEntered: '',

    /**
     * Are we currently switching panels ?
     */
    _switchingPanel: false,

    /*
    * Timeout after incorrect attempt
    */
    kPassCodeErrorTimeout: 500,

    /*
    * Counter after incorrect attempt
    */
    kPassCodeErrorCounter: 0,

    /*
    * Timeout ID for backing from triggered state to normal state
    */
    triggeredTimeoutId: 0,

    /*
    * Max value for handle swiper up
    */
    HANDLE_MAX: 70,

    /**
     * Object used for handling the clock UI element, wraps all related timers
     */
    clock: new window.Clock()
  };  // -- LockScreen.prototype --

  LockScreen.prototype.handleEvent =
  function ls_handleEvent(evt) {
    switch (evt.type) {
      case 'ftuopen':
        this.unlock(true);
        break;
      case 'screenchange':
        // Don't lock if screen is turned off by promixity sensor.
        if (evt.detail.screenOffBy == 'proximity') {
          break;
        }

        // XXX: If the screen is not turned off by ScreenManager
        // we would need to lock the screen again
        // when it's being turned back on
        if (!evt.detail.screenEnabled) {
          // Don't update the time after we're already locked otherwise turning
          // the screen off again will bypass the passcode before the timeout.
          if (!this.locked) {
            this._screenOffTime = new Date().getTime();
          }

          // Remove camera once screen turns off
          if (this.camera.firstElementChild) {
            this.camera.removeChild(this.camera.firstElementChild);
          }

          // Stop refreshing the clock when the screen is turned off.
          this.clock.stop();
        } else {
          var _screenOffInterval = new Date().getTime() - this._screenOffTime;
          if (_screenOffInterval > this.passCodeRequestTimeout * 1000) {
            this._passCodeTimeoutCheck = true;
          } else {
            this._passCodeTimeoutCheck = false;
          }

          // Resume refreshing the clock when the screen is turned on.
          this.clock.start(this.refreshClock.bind(this));

          // Show the unlock keypad immediately
          if (this.passCodeEnabled && this._passCodeTimeoutCheck) {
            this.switchPanel('passcode');
          }
        }
        // No matter turn on or off from screen timeout or poweroff,
        // all secure apps would be hidden.
        this.dispatchEvent('secure-killapps');
        this.lockIfEnabled(true);
        break;

      case 'click':
        if (0 === evt.mozInputSource &&
            (this.areaUnlock === evt.target ||
             this.areaCamera === evt.target)) {
          evt.preventDefault();
          this.handleIconClick(evt.target);
          break;
        }

        if (this.altCameraButton === evt.target) {
          this.handleIconClick(evt.target);
          break;
        }

        if (!evt.target.dataset.key) {
          break;
        }

        // Cancel the default action of <a>
        evt.preventDefault();
        this.handlePassCodeInput(evt.target.dataset.key);
        break;

      case 'touchstart':
        // Edge case: when the passcode is valid, passpad should fade out.
        // So the touchevent should do nothing.
        var passcodeValid =
          ('success' === this.overlay.dataset.passcodeStatus);
        if (passcodeValid) {
          return;
        }

        window.addEventListener('touchend', this);
        this.overlay.classList.add('touched');
        break;

      case 'touchend':
        window.removeEventListener('touchmove', this);
        window.removeEventListener('touchend', this);
        this.overlay.classList.remove('touched');
        break;
      case 'transitionend':
        if (evt.target !== this.overlay) {
          return;
        }

        if (this.overlay.dataset.panel !== 'camera' &&
            this.camera.firstElementChild) {
          this.camera.removeChild(this.camera.firstElementChild);
        }

        if (!this.locked) {
          this.switchPanel();
          this.overlay.hidden = true;
          this.dispatchEvent('unlock', this.unlockDetail);
          this.unlockDetail = undefined;
        }
        break;

      case 'home':
        if (this.locked) {
          if (this.passCodeEnabled) {
            this.switchPanel('passcode');
          } else {
            this.switchPanel();
          }
          this.dispatchEvent('secure-closeapps');
          evt.stopImmediatePropagation();
        }
        break;

      case 'holdhome':
        if (!this.locked) {
          return;
        }

        evt.stopImmediatePropagation();
        evt.stopPropagation();
        break;

      case 'callschanged':
        var emergencyCallBtn = this.passcodePad.querySelector('a[data-key=e]');
        if (!!navigator.mozTelephony.calls.length) {
          emergencyCallBtn.classList.add('disabled');
        } else {
          emergencyCallBtn.classList.remove('disabled');
        }
        // Return to main panel once call state changes.
        if (this.locked) {
          this.switchPanel();
        }
        break;
      case 'lockscreenslide-unlocker-initializer':
        this._unlockerInitialized = true;
        break;
      case 'lockscreenslide-near-left':
        break;
      case 'lockscreenslide-near-right':
        break;
      case 'lockscreenslide-unlocking-start':
        this._notifyUnlockingStart();
        break;
      case 'lockscreenslide-unlocking-stop':
        this._notifyUnlockingStop();
        break;
      case 'lockscreenslide-activate-left':
        this._activateCamera();
        break;
      case 'lockscreenslide-activate-right':
        this._activateUnlock();
        break;
      case 'emergency-call-leave':
        this.handleEmergencyCallLeave();
        break;
      case 'lockscreen-mode-on':
        this.modeSwitch(evt.detail, true);
        break;
      case 'lockscreen-mode-off':
        this.modeSwitch(evt.detail, false);
        break;
    }
  };  // -- LockScreen#handleEvent --

  LockScreen.prototype.initEmergencyCallEvents =
  function() {
    window.addEventListener('emergency-call-leave', this);
  };

  /**
   * This function would exist until we refactor the lockscreen.js with
   * new patterns. @see https://bugzil.la/960381
   *
   * @memberof LockScreen
   * @this {LockScreen}
   */
  LockScreen.prototype.init =
  function ls_init() {
    this.ready = true;
    this._unlocker = new window.LockScreenSlide();
    this.getAllElements();

    this.lockIfEnabled(true);
    this.writeSetting(this.enabled);
    this.initUnlockerEvents();
    this.initEmergencyCallEvents();

    /* Status changes */
    window.addEventListener('volumechange', this);
    window.addEventListener('screenchange', this);

    /* Incoming and normal mode would be different */
    window.addEventListener('lockscreen-mode-switch', this);
    document.addEventListener('visibilitychange', this);

    /* Telephony changes */
    if (navigator.mozTelephony) {
      navigator.mozTelephony.addEventListener('callschanged', this);
    }

    /* Gesture */
    this.area.addEventListener('touchstart', this);
    this.areaCamera.addEventListener('click', this);
    this.areaUnlock.addEventListener('click', this);
    this.altCameraButton.addEventListener('click', this);
    this.iconContainer.addEventListener('touchstart', this);

    /* Unlock & camera panel clean up */
    this.overlay.addEventListener('transitionend', this);

    /* Passcode input pad*/
    this.passcodePad.addEventListener('click', this);

    /* switching panels */
    window.addEventListener('home', this);

    /* blocking holdhome and prevent Cards View from show up */
    window.addEventListener('holdhome', this, true);

    window.addEventListener('ftuopen', this);

    /* mobile connection state on lock screen */
    if (window.navigator.mozMobileConnections) {
      this._lockscreenConnInfoManager =
        new window.LockScreenConnInfoManager(this.connStates);
    }

    /* media playback widget */
    this.mediaPlaybackWidget =
      new window.MediaPlaybackWidget(this.mediaContainer);

    window.SettingsListener.observe('lockscreen.enabled', true,
      (function(value) {
        this.setEnabled(value);
    }).bind(this));

    var wallpaperURL = new window.SettingsURL();

    window.SettingsListener.observe('wallpaper.image',
                             'resources/images/backgrounds/default.png',
                             (function(value) {
                               this.updateBackground(wallpaperURL.set(value));
                               this.overlay.classList.remove('uninit');
                             }).bind(this));

    window.SettingsListener.observe(
      'lockscreen.passcode-lock.code', '0000', (function(value) {
      this.passCode = value;
    }).bind(this));

    window.SettingsListener.observe(
        'lockscreen.passcode-lock.enabled', false, (function(value) {
      this.setPassCodeEnabled(value);
    }).bind(this));

    window.SettingsListener.observe('lockscreen.unlock-sound.enabled',
      true, (function(value) {
      this.setUnlockSoundEnabled(value);
    }).bind(this));

    window.SettingsListener.observe('lockscreen.passcode-lock.timeout',
      0, (function(value) {
      this.passCodeRequestTimeout = value;
    }).bind(this));
    navigator.mozL10n.ready(this.l10nInit.bind(this));
  };

  LockScreen.prototype.initUnlockerEvents =
  function ls_initUnlockerEvents() {
    window.addEventListener('lockscreenslide-unlocker-initializer', this);
    window.addEventListener('lockscreenslide-near-left', this);
    window.addEventListener('lockscreenslide-near-right', this);
    window.addEventListener('lockscreenslide-unlocking-start', this);
    window.addEventListener('lockscreenslide-activate-left', this);
    window.addEventListener('lockscreenslide-activate-right', this);
    window.addEventListener('lockscreenslide-unlocking-stop', this);
  };

  LockScreen.prototype.suspendUnlockerEvents =
  function ls_initUnlockerEvents() {
    window.removeEventListener('lockscreenslide-unlocker-initializer', this);
    window.removeEventListener('lockscreenslide-near-left', this);
    window.removeEventListener('lockscreenslide-near-right', this);
    window.removeEventListener('lockscreenslide-unlocking-start', this);
    window.removeEventListener('lockscreenslide-activate-left', this);
    window.removeEventListener('lockscreenslide-activate-right', this);
    window.removeEventListener('lockscreenslide-unlocking-stop', this);
  };

  /**
   * We need to do some refreshing thing after l10n is ready.
   *
   * @memberof LockScreen
   * @this {LockScreen}
   */
  LockScreen.prototype.l10nInit =
  function ls_l10nInit() {
    this.refreshClock(new Date());
  };

  /*
  * Set enabled state.
  * If enabled state is somehow updated when the lock screen is enabled
  * This function will unlock it.
  */
  LockScreen.prototype.setEnabled =
  function ls_setEnabled(val) {
    if (typeof val === 'string') {
      this.enabled = val == 'false' ? false : true;
    } else {
      this.enabled = val;
    }

    if (!this.enabled && this.locked) {
      this.unlock();
    }
  };

  LockScreen.prototype.setPassCodeEnabled =
  function ls_setPassCodeEnabled(val) {
    if (typeof val === 'string') {
      this.passCodeEnabled = val == 'false' ? false : true;
    } else {
      this.passCodeEnabled = val;
    }
  };

  LockScreen.prototype.setUnlockSoundEnabled =
  function ls_setUnlockSoundEnabled(val) {
    if (typeof val === 'string') {
      this.unlockSoundEnabled = val == 'false' ? false : true;
    } else {
      this.unlockSoundEnabled = val;
    }
  };

  /**
   * Light the camera and unlocking icons when user touch on our LockScreen.
   *
   * @this {LockScreen}
   */
  LockScreen.prototype._lightIcons =
  function() {
    this.rightIcon.classList.remove('dark');
    this.leftIcon.classList.remove('dark');
  };

  /**
   * Dark the camera and unlocking icons when user leave our LockScreen.
   *
   * @this {LockScreen}
   */
  LockScreen.prototype._darkIcons =
  function() {
    this.rightIcon.classList.add('dark');
    this.leftIcon.classList.add('dark');
  };

  LockScreen.prototype._notifyUnlockingStart =
  function ls_notifyUnlockingStart() {
    window.dispatchEvent(new CustomEvent('unlocking-start'));
  };

  LockScreen.prototype._notifyUnlockingStop =
  function ls_notifyUnlockingStop() {
    window.dispatchEvent(new CustomEvent('unlocking-stop'));
  };

  /**
   * Activate the camera.
   *
   * @this {LockScreen}
   */
  LockScreen.prototype._activateCamera =
  function ls_activateCamera() {
    var panelOrFullApp = () => {
      // If the passcode is enabled and it has a timeout which has passed
      // switch to secure camera
      if (this.passCodeEnabled && this._passCodeTimeoutCheck) {
        // Go to secure camera panel
        this.switchPanel('camera');
        return;
      }

      this.unlock(/* instant */ null, /* detail */ { areaCamera: true });

      var a = new window.MozActivity({
        name: 'record',
        data: {
          type: 'photos'
        }
      });
      a.onerror = function ls_activityError() {
        console.log('MozActivity: camera launch error.');
      };
    };

    panelOrFullApp();
  };

  LockScreen.prototype._activateUnlock =
  function ls_activateUnlock() {
    var passcodeOrUnlock = () => {
      if (this.passCodeEnabled) {
        if (0 === this.passCodeRequestTimeout) {
          // If the user didn't set any valid timeout.
          this.switchPanel('passcode');
        } else if (this._passCodeTimeoutCheck) {
          // Or the timeout expired (so should lock it).
          this.switchPanel('passcode');
        } else {
          // Otherwise, user set a timeout but it didn't expire yet.
          this.unlock();
        }
      } else {
        this.unlock();
      }
    };
    passcodeOrUnlock();
  };

  LockScreen.prototype.handleIconClick =
  function ls_handleIconClick(target) {
    switch (target) {
      case this.areaCamera:
      case this.altCameraButton:
        this._activateCamera();
        break;
      case this.areaUnlock:
        this._activateUnlock();
        break;
    }
  };

  LockScreen.prototype.handlePassCodeInput =
  function ls_handlePassCodeInput(key) {
    switch (key) {
      case 'e': // 'E'mergency Call
        this.switchPanel('emergency-call');
        break;

      case 'c': // 'C'ancel
        this.switchPanel();
        break;

      case 'b': // 'B'ackspace for correction
        if (this.overlay.dataset.passcodeStatus) {
          return;
        }

        this.passCodeEntered =
          this.passCodeEntered.substr(0, this.passCodeEntered.length - 1);
        this.updatePassCodeUI();

        break;
      default:
        if (this.overlay.dataset.passcodeStatus) {
          return;
        }

        this.passCodeEntered += key;
        this.updatePassCodeUI();

        if (this.passCodeEntered.length === 4) {
          this.checkPassCode();
        }
        break;
    }
  };

  LockScreen.prototype.handleEmergencyCallLeave =
  function ls_handleEmergencyCallLeave() {
    this.switchPanel();
  };

  LockScreen.prototype.lockIfEnabled =
  function ls_lockIfEnabled(instant) {
    if (window.FtuLauncher && window.FtuLauncher.isFtuRunning()) {
      this.unlock(instant);
      return;
    }

    if (this.enabled) {
      this.lock(instant);
    } else {
      this.unlock(instant);
    }
  };

  LockScreen.prototype.unlock =
  function ls_unlock(instant, detail) {
    // This file is loaded before the Window Manager in order to intercept
    // hardware buttons events. As a result AppWindowManager is not defined when
    // the device is turned on and this file is loaded.
    var app = window.AppWindowManager ?
      window.AppWindowManager.getActiveApp() : null;
    var wasAlreadyUnlocked = !this.locked;
    this.locked = false;

    this.mainScreen.focus();
    this.mainScreen.classList.remove('locked');

    // The lockscreen will be hidden, stop refreshing the clock.
    this.clock.stop();

    if (wasAlreadyUnlocked) {
      return;
    }
    this.dispatchEvent('will-unlock', detail);
    this.dispatchEvent('secure-modeoff');
    this.writeSetting(false);

    if (this.unlockSoundEnabled) {
      var unlockAudio = new Audio('./resources/sounds/unlock.opus');
      unlockAudio.play();
    }

    this.overlay.classList.toggle('no-transition', instant);

    // Actually begin unlock until the foreground app is painted
    var repaintTimeout = 0;
    var nextPaint = (function() {
      clearTimeout(repaintTimeout);
      this.overlay.classList.add('unlocked');

      // If we don't unlock instantly here,
      // these are run in transitioned callback.
      if (instant) {
        this.switchPanel();
        this.overlay.hidden = true;
        this.dispatchEvent('unlock', detail);
      } else {
        this.unlockDetail = detail;
      }
    }).bind(this);
    if (app) {
      app.tryWaitForFullRepaint(nextPaint);
    }

    // Give up waiting for nextpaint after 400ms
    // XXX: Does not consider the situation where the app is painted already
    // behind the lock screen (why?).
    repaintTimeout = setTimeout(function ensureUnlock() {
      nextPaint();
    }, 400);
  };

  LockScreen.prototype.lock =
  function ls_lock(instant) {
    var wasAlreadyLocked = this.locked;
    this.locked = true;
    this.switchPanel();

    this.overlay.focus();
    this.overlay.classList.toggle('no-transition', instant);

    this.mainScreen.classList.add('locked');
    this.overlay.classList.remove('unlocked');
    this.overlay.hidden = false;
    screen.mozLockOrientation(window.OrientationManager.defaultOrientation);

    if (!wasAlreadyLocked) {
      if (document.mozFullScreen) {
        document.mozCancelFullScreen();
      }

      // Any changes made to this,
      // also need to be reflected in apps/system/js/storage.js
      this.dispatchEvent('lock');
      this.dispatchEvent('secure-modeon');
      this.writeSetting(true);
    }
  };

  LockScreen.prototype.loadPanel =
  function ls_loadPanel(panel, callback) {
    var frame = null;
    this._loadingPanel = true;

    switch (panel) {
      case 'passcode':
      case 'main':
        this.overlay.classList.add('no-transition');
        if (callback) {
          setTimeout(callback);
        }
        break;

      case 'emergency-call':
        // create the <iframe> and load the emergency call
        frame = document.createElement('iframe');
        frame.src = './emergency-call/index.html';
        frame.onload = function emergencyCallLoaded() {
          if (callback) {
            callback();
          }
        };
        this.panelEmergencyCall.appendChild(frame);
        break;

      case 'camera':
        // XXX hardcode URLs
        // Proper fix should be done in bug 951978 and friends.
        var cameraAppUrl =
          window.location.href.replace('system', 'camera');
        var cameraAppManifestURL =
          cameraAppUrl.replace(/(\/)*(index.html)*$/, '/manifest.webapp');
        cameraAppUrl += '#secure';
        window.dispatchEvent(new window.CustomEvent('secure-launchapp',
          {
            'detail': {
             'appURL': cameraAppUrl,
             'appManifestURL': cameraAppManifestURL
            }
          }
        ));
        this.overlay.classList.remove('no-transition');
        callback();
        break;
    }
  };

  LockScreen.prototype.unloadPanel =
  function ls_unloadPanel(panel, toPanel, callback) {
    switch (panel) {
      case 'passcode':
        // Reset passcode panel only if the status is not error
        if (this.overlay.dataset.passcodeStatus == 'error') {
          break;
        }

        delete this.overlay.dataset.passcodeStatus;
        this.passCodeEntered = '';
        this.updatePassCodeUI();
        break;

      case 'camera':
        this.mainScreen.classList.remove('lockscreen-camera');
        this.overlay.classList.remove('unlocked');
        this.overlay.hidden = false;
        break;

      case 'emergency-call':
        var ecPanel = this.panelEmergencyCall;
        ecPanel.addEventListener('transitionend', function unloadPanel() {
          ecPanel.removeEventListener('transitionend', unloadPanel);
          ecPanel.removeChild(ecPanel.firstElementChild);
        });
        break;

      case 'main':
      /* falls through */
      default:
        var unload = () => {
          this.overlay.classList.remove('triggered');
          clearTimeout(this.triggeredTimeoutId);
        };

        if (toPanel !== 'camera') {
          unload();
          break;
        }

        this.overlay.addEventListener('transitionend',
          (function ls_unloadDefaultPanel(evt) {
            if (evt.target !== this) {
              return;
            }
            this.overlay.removeEventListener('transitionend',
                                             ls_unloadDefaultPanel);
            unload();
          }).bind(this)
        );
        break;
    }

    if (callback) {
      setTimeout(callback);
    }
   };

  /**
   * Switch the panel to the target type.
   * Will actually call the load and unload panel function.
   *
   * @param {PanelType} panel Could be 'camera', 'passcode', 'emergency-call' or
   *                          undefined. Undefined means the main panel.
   */
  LockScreen.prototype.switchPanel =
  function ls_switchPanel(panel) {
    if (this._switchingPanel) {
      return;
    }

    panel = panel || 'main';
    var overlay = this.overlay;
    var currentPanel = overlay.dataset.panel;

    if (currentPanel && currentPanel === panel) {
      return;
    }

    this._switchingPanel = true;
    this.loadPanel(panel, () => {
      this.unloadPanel(overlay.dataset.panel, panel,
        () => {
          this.dispatchEvent('lockpanelchange', { 'panel': panel });
          overlay.dataset.panel = panel;
          this._switchingPanel = false;
        });
    });
  };

  LockScreen.prototype.refreshClock =
  function ls_refreshClock(now) {
    if (!this.locked) {
      return;
    }

    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    var timeFormat = _('shortTimeFormat');
    var dateFormat = _('longDateFormat');
    var time = f.localeFormat(now, timeFormat);
    this.clockNumbers.textContent = time.match(/([012]?\d).[0-5]\d/g);
    this.clockMeridiem.textContent = (time.match(/AM|PM/i) || []).join('');
    this.date.textContent = f.localeFormat(now, dateFormat);
  };

  LockScreen.prototype.updatePassCodeUI =
  function lockscreen_updatePassCodeUI() {
    var overlay = this.overlay;

    if (overlay.dataset.passcodeStatus) {
      return;
    }

    if (this.passCodeEntered) {
      overlay.classList.add('passcode-entered');
    } else {
      overlay.classList.remove('passcode-entered');
    }
    var i = 4;
    while (i--) {
      var span = this.passcodeCode.childNodes[i];
      if (span) {
        if (this.passCodeEntered.length > i) {
          span.dataset.dot = true;
        } else {
          delete span.dataset.dot;
        }
      }
    }
  };

  LockScreen.prototype.checkPassCode =
  function lockscreen_checkPassCode() {
    if (this.passCodeEntered === this.passCode) {
      this.overlay.dataset.passcodeStatus = 'success';
      this.passCodeError = 0;
      this.kPassCodeErrorTimeout = 500;
      this.kPassCodeErrorCounter = 0;

      var transitionend = () => {
        this.passcodeCode.removeEventListener('transitionend', transitionend);
        this.unlock();
      };
      this.passcodeCode.addEventListener('transitionend', transitionend);
    } else {
      this.overlay.dataset.passcodeStatus = 'error';
      this.kPassCodeErrorCounter++;
      //double delay if >5 failed attempts
      if (this.kPassCodeErrorCounter > 5) {
        this.kPassCodeErrorTimeout = 2 * this.kPassCodeErrorTimeout;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }

      setTimeout(() => {
        delete this.overlay.dataset.passcodeStatus;
        this.passCodeEntered = '';
        this.updatePassCodeUI();
      }, this.kPassCodeErrorTimeout);
    }
  };

  LockScreen.prototype.updateBackground =
  function ls_updateBackground(value) {
    var background = document.getElementById('lockscreen-background'),
        url = 'url(' + value + ')';
    background.style.backgroundImage = url;
  };

  /**
   * To get all elements this component will use.
   * Note we do a name mapping here: DOM variables named like 'passcodePad'
   * are actually corresponding to the lowercases with hyphen one as
   * 'passcode-pad', then be prefixed with 'lookscreen'.
   */
  LockScreen.prototype.getAllElements =
  function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['conn-states', 'clock-numbers', 'clock-meridiem',
        'date', 'area', 'area-unlock', 'area-camera', 'icon-container',
        'area-handle', 'area-slide', 'media-container', 'passcode-code',
        'alt-camera', 'alt-camera-button', 'slide-handle',
        'passcode-pad', 'camera', 'accessibility-camera',
        'accessibility-unlock', 'panel-emergency-call', 'canvas'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    elements.forEach((function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById('lockscreen-' + name);
    }).bind(this));

    this.overlay = document.getElementById('lockscreen');
    this.mainScreen = document.getElementById('screen');
  };

  LockScreen.prototype.dispatchEvent =
  function ls_dispatchEvent(name, detail) {
    var evt = new CustomEvent(name, {
      'bubbles': true,
      'cancelable': true,
      // Set event detail if needed for the specific event 'name' (relevant for
      // passing which button triggered the event)
      'detail': detail
    });
    window.dispatchEvent(evt);
  };

  LockScreen.prototype.writeSetting =
  function ls_writeSetting(value) {
    if (!window.navigator.mozSettings) {
      return;
    }

    window.SettingsListener.getSettingsLock().set({
      'lockscreen.locked': value
    });
  };

  /**
   * @param {boolean} switcher - true if mode is on, false if off.
   */
  LockScreen.prototype.modeSwitch =
  function ls_modeSwitch(mode, switcher) {
    if (switcher) {
      if (mode !== this.configs.mode) {
        this.suspend();
      }
    } else {
      if (mode !== this.configs.mode) {
        this.resume();
      }
    }
  };

  LockScreen.prototype.suspend =
  function ls_suspend() {
    this.suspendUnlockerEvents();
  };

  LockScreen.prototype.resume =
  function ls_resume() {
    this.initUnlockerEvents();
  };

  /** @exports LockScreen */
  exports.LockScreen = LockScreen;

  // XXX: Before we make a reasonable way to register
  // global names before 'load' event, to satisfy some
  // requests from the components like AppWindowManager,
  // we must do this to register global names before we
  // got loaded.

  /** @global*/
  window.lockScreen = new LockScreen();
})(window);
