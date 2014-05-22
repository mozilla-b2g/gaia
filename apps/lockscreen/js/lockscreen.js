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

  const DEBUG = true;

  var LockScreen = function() {
    this.setup();
  };

  /**
   * Setup the instance.
   */
  LockScreen.prototype.setup = function() {
    this.configs = {
      mode: 'default',
      commname: 'lockscreencomms'
    };

    // From |navigator.mozApps.getSelf()|
    this.app = null;

    // To queue the messages before the app is ready.
    this._messageQueue = [];

    // FilePath: unlock.ogg
    this._fpUnlockOgg = './resources/sounds/unlock.ogg';

    // The unlocking strategy.
    this._unlocker = null;
    this._unlockerInitialized = false;

    /*
    * Lockscreen connection information manager
    */
    this._lockscreenConnInfoManager = null;

    /*
    * Boolean return true when initialized.
    */
    this.ready = false;

    /*
    * Boolean return whether if the lock screen is enabled or not.
    * Must not multate directly - use setEnabled(val)
    * Only Settings Listener should change this value to sync with data
    * in Settings API.
    */
    this.enabled = true;

    /*
    * Boolean returns wether we want a sound effect when unlocking.
    */
    this.unlockSoundEnabled = false;

    /*
    * Boolean return whether if the lock screen is enabled or not.
    * Must not multate directly - use setPassCodeEnabled(val)
    * Only Settings Listener should change this value to sync with data
    * in Settings API.
    * Will be ignored if 'enabled' is set to false.
    */
    this.passCodeEnabled = false;

    /*
    * Four digit Passcode
    * XXX: should come for Settings
    */
    this.passCode = '0000';

    /*
    * The time to request for passcode input since device is off.
    */
    this.passCodeRequestTimeout = 0;

    /*
    * Store the first time the screen went off since unlocking.
    */
    this._screenOffTime = 0;

    /*
    * Check the timeout of passcode lock
    */
    this._passCodeTimeoutCheck = false;

    /*
    * If user is sliding.
    */
    this._sliding = false;

    /*
    * If user had released the finger and the handle already
    * reached one of the ends.
    */
    this._slideReachEnd = false;

    /*
    * Current passcode entered by the user
    */
    this.passCodeEntered = '';

    /**
     * Are we currently switching panels ?
     */
    this._switchingPanel = false;

    /*
    * Timeout after incorrect attempt
    */
    this.kPassCodeErrorTimeout = 500;

    /*
    * Counter after incorrect attempt
    */
    this.kPassCodeErrorCounter = 0;

    /*
    * Timeout ID for backing from triggered state to normal state
    */
    this.triggeredTimeoutId = 0;

    /*
    * Max value for handle swiper up
    */
    this.HANDLE_MAX = 70;

    /**
     * Object used for handling the clock UI element, wraps all related timers
     */
    this.clock = new window.Clock();
  };

  LockScreen.prototype.handleIACMessages =
  function ls_handleIACMessages(message) {
    var {type, detail} = message;
    this.debug('(II) received IAC message: ', type, detail);
    switch (type) {
      case 'request-add-notification':
      case 'request-close-notification':
        this.dispatchEvent(type, detail, false);
        break;
      case 'request-lock':
        this.debug('(II) would lock because request');
        // No matter whether are passcode-locking or not,
        // return to the main panel first.
        this.switchPanel();
        this.responseLock();
        break;
      case 'request-unlock':
        // Do not call unlock directly because we may need to
        // check passcode, or do other checks.
        this.responseUnlock();
        break;
    }
  };

  LockScreen.prototype.handleEvent =
  function ls_handleEvent(evt) {
    this.debug('(II) event received: ', evt.type, evt.detail);
    switch (evt.type) {
      case 'visibilitychange':
        // When this app shows, it must be locked.
        // It would be meanless if we show an unlocked LockScreen.
        if (!document.hidden) {
          this.lock(true);
          this.clock.start(this.refreshClock.bind(this));
        } else {
          this._screenOffTime = new Date().getTime();
          // When it got hidden, switch to main panel to restore the states.
          this.switchPanel();

          // The lockscreen will be hidden, stop refreshing the clock.
          this.clock.stop();
        }
        break;
      case 'ftuopen':
        this.unlock(true);
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

        this.switchPanel();
        this.overlay.hidden = true;
        this.dispatchEvent('unlock', this.unlockDetail);
        this.unlockDetail = undefined;
        break;

      case 'callschanged':
        var emergencyCallBtn = this.passcodePad.querySelector('a[data-key=e]');
        if (!!navigator.mozTelephony.calls.length) {
          emergencyCallBtn.classList.add('disabled');
        } else {
          emergencyCallBtn.classList.remove('disabled');
        }
        this.switchPanel();
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
      case 'iac-' + this.configs.commname:
        this.handleIACMessages(evt.detail);
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
  LockScreen.prototype.bootstrap =
  function ls_bootstrap() {
    navigator.mozApps.getSelf().onsuccess = (evt) => {
      this.app = evt.target.result;
      this.app.connect(this.configs.commname).then((ports) => {
        console.log('(II) Connected to: ', this.configs.commname);
      }).catch((reason) => {
        console.log('(EE) Connection rejected: ', reason);
      });
      this.postQueuedMessages();
    };

    this.ready = true;
    this._unlocker = new window.LockScreenSlide();
    this.getAllElements();

    this.lockIfEnabled(true);
    this.writeSetting(this.enabled);
    this.initUnlockerEvents();
    this.initEmergencyCallEvents();

    window.addEventListener('iac-' + this.configs.commname, this);

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

    window.SettingsListener.observe('lockscreen.lock-message',
      '', (function(value) {
      this.setLockMessage(value);
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
    this.clock.start(this.refreshClock.bind(this));
  };

  /*
  * Set enabled state.
  * If enabled state is somehow updated when the lock screen is enabled
  * This function will unlock it.
  */
  LockScreen.prototype.setEnabled =
  function ls_setEnabled(val) {
    var prevEnabled = this.enabled;
    if (typeof val === 'string') {
      this.enabled = val == 'false' ? false : true;
    } else {
      this.enabled = val;
    }

    if (prevEnabled && !this.enabled) {
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

  LockScreen.prototype.setLockMessage =
  function ls_setLockMessage(val) {
    this.message.textContent = val;
    this.message.hidden = (val === '');
  },

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
    this.dispatchEvent('unlocking-start');
  };

  LockScreen.prototype._notifyUnlockingStop =
  function ls_notifyUnlockingStop() {
    this.dispatchEvent('unlocking-stop');
  };

  /**
   * Activate the camera.
   *
   * @this {LockScreen}
   */
  LockScreen.prototype._activateCamera =
  function ls_activateCamera() {
    // If the passcode is enabled and it has a timeout which has passed
    // switch to secure camera
    if (this.passCodeEnabled && this.checkPassCodeTimeout()) {
      this.invokeSecureApp('camera');
      this.switchPanel('passcode');
      return;
    }

    var activityContent = {
      name: 'record',
      data: { type: 'photos' }
    };
    this.unlock();
    this.postMessage('activity-unlock',
      {'detail': activityContent});
  };

  LockScreen.prototype._activateUnlock =
  function ls_activateUnlock() {

    var passcodeOrUnlock = (function() {
      if (this.passCodeEnabled && this.checkPassCodeTimeout()) {
          this.switchPanel('passcode');
      } else {
        this.unlock();
      }
    }).bind(this);
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

  LockScreen.prototype.invokeSecureApp =
  function ls_invokeSecureApp(name) {

    //XXX: Still so hack...
    var url =
          window.location.href.replace('lockscreen', name),
        manifestUrl =
          url.replace(/(\/)*(index.html)*$/, '/manifest.webapp');

    url += '#secure';
    this.dispatchEvent('secure-launchapp',
      {
        'detail': {
         'appURL': url,
         'appManifestURL': manifestUrl
        }
      }
    );
  };

  LockScreen.prototype.handlePassCodeInput =
  function ls_handlePassCodeInput(key) {
    switch (key) {
      case 'e': // 'E'mergency Call
        this.invokeSecureApp('emergency-call');
        this.switchPanel('passcode');
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
    if (this.enabled) {
      this.lock(instant);
    } else {
      this.unlock(instant);
    }
  };

  LockScreen.prototype.unlock =
  function ls_unlock(instant, detail) {
    this.dispatchEvent('will-unlock');
    this.dispatchEvent('secure-modeoff');
    this.writeSetting(false);
    this.dispatchEvent('unlock');
  };

  LockScreen.prototype.lock =
  function ls_lock(instant) {
    this.switchPanel('main');

    this.overlay.focus();
    this.overlay.classList.toggle('no-transition', instant);

    this.overlay.classList.remove('unlocked');
    this.overlay.hidden = false;

    this.dispatchEvent('lock');
    this.dispatchEvent('secure-modeon');
    this.writeSetting(true);
  };

  LockScreen.prototype.loadPanel =
  function ls_loadPanel(panel, callback) {
    this._loadingPanel = true;

    switch (panel) {
      case 'passcode':
      case 'main':
        this.overlay.classList.add('no-transition');
        if (callback) {
          setTimeout(callback);
        }
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
        this.overlay.classList.remove('unlocked');
        this.overlay.hidden = false;
        break;

      case 'main':
      /* falls through */
      default:
        var unload = (function() {
          this.overlay.classList.remove('triggered');
          clearTimeout(this.triggeredTimeoutId);
        }).bind(this);

        if (toPanel !== 'camera') {
          unload();
          break;
        }

        // Wait the previous transition end to play this style change.
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
    this.loadPanel(panel, (function() {
      this.unloadPanel(overlay.dataset.panel, panel,
        (function() {
          this.dispatchEvent('lockpanelchange', { 'panel': panel });
          overlay.dataset.panel = panel;
          this._switchingPanel = false;
        }).bind(this));
    }).bind(this));
  };

  LockScreen.prototype.refreshClock =
  function ls_refreshClock(now) {
    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    var timeFormat = _('shortTimeFormat').replace('%p', '<span>%p</span>');
    var dateFormat = _('longDateFormat');
    this.clockTime.innerHTML = f.localeFormat(now, timeFormat);
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
    var spans = [...this.passcodeCode.querySelectorAll('.code-container span')];
    spans.forEach((span, i) => {
      if (i < this.passCodeEntered.length) {
        span.dataset.dot = true;
      } else {
        delete span.dataset.dot;
      }
    });
  };

  LockScreen.prototype.checkPassCode =
  function lockscreen_checkPassCode() {
    if (this.passCodeEntered === this.passCode) {
      this.overlay.dataset.passcodeStatus = 'success';
      this.passCodeError = 0;
      this.kPassCodeErrorTimeout = 500;
      this.kPassCodeErrorCounter = 0;

      var transitionend = (function() {
        this.passcodeInput.removeEventListener('transitionend', transitionend);
        this.unlock();
      }).bind(this);
      this.passcodeInput.addEventListener('transitionend', transitionend);
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

      setTimeout((function() {
        delete this.overlay.dataset.passcodeStatus;
        this.passCodeEntered = '';
        this.updatePassCodeUI();
      }).bind(this), this.kPassCodeErrorTimeout);
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
    var elements = ['conn-states', 'clock-time', 'date', 'area',
        'area-unlock', 'area-camera', 'icon-container',
        'area-handle', 'area-slide', 'media-container', 'passcode-code',
        'alt-camera', 'alt-camera-button', 'slide-handle',
        'passcode-pad', 'camera', 'accessibility-camera',
        'accessibility-unlock', 'panel-emergency-call', 'canvas', 'message',
        'passcode-input'];

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
  function ls_dispatchEvent(name, detail, iac) {
    var evt = new CustomEvent(name, {
      'bubbles': true,
      'cancelable': true,
      // Set event detail if needed for the specific event 'name' (relevant for
      // passing which button triggered the event)
      'detail': detail
    });
    window.dispatchEvent(evt);
    this.debug('(II) has dispatched: ', name);
    if (false === iac) {
      return;
    }
    this.postMessage(name, detail);
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

  /**
   * Check if the timeout has been expired and we need to check the passcode.
   */
  LockScreen.prototype.checkPassCodeTimeout =
    function ls_checkPassCodeTimeout() {
      var _screenOffInterval = new Date().getTime() - this._screenOffTime;
      // If user set timeout, then
      // - if timeout expired, do check
      // - if timeout is valid, do not check
      if (0 !== this.passCodeRequestTimeout) {
        if (_screenOffInterval > this.passCodeRequestTimeout * 1000) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    };

  /**
   * Queuing messages before the app was ready.
   * This can prevent some messages not post.
   *
   * @private
   * @param {object} - the message
   */
  LockScreen.prototype.queueMessage =
    function ls_queueMessage(message) {
      this._messageQueue.push(message);
    };

  /**
   * Post all queued message.
   * @private
   */
  LockScreen.prototype.postQueuedMessages =
    function ls_postQueuedMessages() {
      this._messageQueue.forEach((message) => {
        this.postMessage(message.type, message.detail);
      });
      // Clean it.
      this._messageQueue.length = 0;
    };

  /**
   * Post message out to the LockScreenManager.
   *
   * @param {string} type
   * @param {object} detail - (optional)
   * @return {Promise}
   */
  LockScreen.prototype.postMessage =
    function ls_postMessage(type, detail) {
      var message = detail || {};
      message.type = type;

      // If app is not ready, do queuing.
      if (!this.app) {
        this.debug('(II) queued message: ', type);
        this.queueMessage(message);

        navigator.mozApps.getSelf().onsuccess = (evt) => {
          this.app = evt.target.result;
          this.postQueuedMessages();
        };
        return;
      }
      this.app.connect(this.configs.commname).then((ports) => {
        this.debug('(II) send IAC in lockscreenapp: ', type);
        ports.forEach(function(port) {
          port.postMessage(message);
        });
      }, (reason) => {
        this.debug('(EE) Communication is rejected ' + reason);
      });
    };

  LockScreen.prototype.debug =
    function ls_debug() {
      if (DEBUG) {
        console.log.apply(console, arguments);
      }
    };

  LockScreen.prototype.responseUnlock = function() {
    this.unlock();
  };

  LockScreen.prototype.responseLock = function() {
    this.dispatchEvent('lock');
    this.dispatchEvent('secure-modeon');
    this.writeSetting(true);
  };

  /** @exports LockScreen */
  exports.LockScreen = LockScreen;
})(window);
