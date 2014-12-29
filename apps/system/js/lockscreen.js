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
  };
  LockScreen.prototype = {
    configs: {
      mode: 'default'
    },
    // 'notificationId' for opening app after unlocking.
    _unlockingMessage: {},
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
    * Listen to 'lockscreen-appclosed/opening/opened' events to properly
    * handle status changes
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
    * Boolean should regenerate overlay color for notifications background
    * When this is true, and when we're locking the device, we should
    * regenerate the overlay color as specified in bug 950884
    * Instead of doing the color generation in updateBackground,
    *  by doing this we can reduce critical path of updateBackground,
    * and perceived performance of selecting wallpaper.
    */
    _shouldRegenerateMaskedBackgroundColor: false,

    /*
    * String url of the background image to regenerate overlay color from
    */
    _regenerateMaskedBackgroundColorFrom: undefined,

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

    clockTimerID: null,

    /*
    * Max value for handle swiper up
    */
    HANDLE_MAX: 70,

    _passcodePadVibrationEnabled: false,

    // Keep in sync with Dialer and Keyboard vibration
    _passcodePadVibrationDuration: 50

  };  // -- LockScreen.prototype --

  LockScreen.prototype.handleEvent =
  function ls_handleEvent(evt) {
    switch (evt.type) {
      case 'lockscreen-notification-request-activate-unlock':
        this._activateUnlock();
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
          this.stopUpdateClock();
        } else {
          this._passCodeTimeoutCheck = this.checkPassCodeTimeout();

          // Resume refreshing the clock when the screen is turned on.
          this.startUpdateClock();
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

        var key = evt.target.dataset.key;
        if (!key &&
            ('div' === evt.target.tagName.toLowerCase() &&
             'a' === evt.target.parentNode.tagName.toLowerCase())
           ) {
          key = evt.target.parentNode.dataset.key;
        }
        if (!key) {
          break;
        }

        // Cancel the default action of <a>
        evt.preventDefault();
        this.handlePassCodeInput(key);
        window.dispatchEvent(new window.CustomEvent(
          'lockscreen-keypad-input', { detail: {
            key: key
          }
        }));
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
          this.overlay.hidden = true;
          this.unlockDetail = undefined;
        }
        break;

      case 'home':
        if (this.locked) {
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
      /**
       * we need to know whether the media player widget is shown or not,
       * in order to decide notification container's height
       * we listen to the same events (iac-mediacomms & appterminated) as
       * in media player widget's codes (/apps/system/js/media_playback.js)
       */
      case 'iac-mediacomms':
        if (evt.detail.type === 'status') {
          switch (evt.detail.data.playStatus) {
            case 'PLAYING':
            case 'PAUSED':
              window.lockScreenNotifications.collapseNotifications();
              window.lockScreenNotifications.adjustContainerVisualHints();
              break;
            case 'STOPPED':
            case 'mozinterruptbegin':
              window.lockScreenNotifications.expandNotifications();
              window.lockScreenNotifications.adjustContainerVisualHints();
              break;
          }
        }
        break;
      case 'appterminated':
        if (evt.detail.origin === this.mediaPlaybackWidget.origin) {
          window.lockScreenNotifications.expandNotifications();
          window.lockScreenNotifications.adjustContainerVisualHints();
        }
        break;
      case 'scroll':
        if (this.notificationsContainer === evt.target) {
          window.lockScreenNotifications.adjustContainerVisualHints();
          break;
        }
        break;
      case 'timeformatchange':
        this.timeFormat = window.navigator.mozHour12 ?
          navigator.mozL10n.get('shortTimeFormat12') :
          navigator.mozL10n.get('shortTimeFormat24');
        this.refreshClock(new Date());
        break;
      case 'ftuopen':
        this.lockIfEnabled(true);
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
    /**
     * "new style" slider: as described in https://bugzil.la/950884
     * setting this parameter to true causes the LockScreenSlide to render
     * the slider specified in that bugzilla issue
     */
    this._unlocker = new window.LockScreenSlide({useNewStyle: true});
    // The default one is 12 hour.
    this.timeFormat = window.navigator.mozHour12 ?
      navigator.mozL10n.get('shortTimeFormat12') :
      navigator.mozL10n.get('shortTimeFormat24');
    this.getAllElements();
    this.notificationsContainer =
      document.getElementById('notifications-lockscreen-container');

    this.lockIfEnabled(true);
    this.initUnlockerEvents();

    /* Status changes */
    window.addEventListener(
      'lockscreen-notification-request-activate-unlock', this);
    window.addEventListener('screenchange', this);

    /* Incoming and normal mode would be different */
    window.addEventListener('lockscreen-mode-switch', this);
    document.addEventListener('visibilitychange', this);

    /* Telephony changes */
    if (navigator.mozTelephony) {
      this.initEmergencyCallEvents();
      navigator.mozTelephony.addEventListener('callschanged', this);
    } else {
      this.passcodePad.querySelector('a[data-key=e]').classList.add('disabled');
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
    /* ensure we unlock if ftu wasnt yet running  */
    window.addEventListener('ftuopen', this);
    window.addEventListener('timeformatchange', this);

    /* mobile connection state on lock screen */
    if (window.navigator.mozMobileConnections) {
      this._lockscreenConnInfoManager =
        new window.LockScreenConnInfoManager(this.connStates);
    }

    /* media playback widget */
    this.mediaPlaybackWidget =
      new window.MediaPlaybackWidget(this.mediaContainer);

    // listen to media playback events to adjust notification container height
    window.addEventListener('iac-mediacomms', this);
    window.addEventListener('appterminated', this);

    window.SettingsListener.observe('lockscreen.enabled', true,
      (function(value) {
        this.setEnabled(value);
    }).bind(this));

    // it is possible that lockscreen is initialized after wallpapermanager
    // (e.g. user turns on lockscreen in settings after system is booted);
    // if this is the case, then the wallpaperchange event might not be captured
    //   and the lockscreen would initialize into empty wallpaper
    // so we need to see if there is already a wallpaper blob available
    if (window.wallpaperManager) {
      var wallpaperURL = window.wallpaperManager.getBlobURL();
      if (wallpaperURL) {
        this.updateBackground(window.wallpaperManager.getBlobURL());
        this.overlay.classList.remove('uninit');
      }
    }
    window.addEventListener('wallpaperchange', (function(evt) {
      this.updateBackground(evt.detail.url);
      this.overlay.classList.remove('uninit');
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

    window.SettingsListener.observe('keyboard.vibration',
      false, (function(value) {
      this._passcodePadVibrationEnabled = !!value;
    }).bind(this));

    // FIXME(ggp) this is currently used by Find My Device
    // to force locking. Should be replaced by a proper IAC API in
    // bug 992277. We don't need to use SettingsListener because
    // we're only interested in changes to the setting, and don't
    // keep track of its value.
    navigator.mozSettings.addObserver('lockscreen.lock-immediately',
      (function(event) {
      if (event.settingValue === true) {
        this.lockIfEnabled(true);
      }
    }).bind(this));

    this.notificationsContainer.addEventListener('scroll', this);

    navigator.mozL10n.ready(this.l10nInit.bind(this));

    // when lockscreen is just initialized,
    // it will lock itself (if enabled) before calling updatebackground,
    // so we need to generate overlay if needed here
    if(this._checkGenerateMaskedBackgroundColor()){
      this._generateMaskedBackgroundColor();
    }

    // start the clock because screenchange won't trigger when
    // screen locks just after boot
    this.startUpdateClock();
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
    this.startUpdateClock();
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

    if (prevEnabled && !this.enabled && this.locked) {
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
    var panelOrFullApp = (function() {
      // If the passcode is enabled and it has a timeout which has passed
      // switch to secure camera
      if (this.passCodeEnabled && this.checkPassCodeTimeout()) {
        this.invokeSecureApp('camera');
        return;
      }
      var activityDetail = {
        name: 'record',
        data: {
          type: 'photos'
        }
      };
      this.unlock(false, { activity: activityDetail } );
    }).bind(this);

    panelOrFullApp();
  };

  LockScreen.prototype._activateUnlock =
  function ls_activateUnlock() {
    if (!(this.passCodeEnabled && this.checkPassCodeTimeout())) {
      this.unlock();
    }
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
    var url =
          window.location.href.replace('system', name),
        manifestUrl =
          url.replace(/(\/)*(index.html#?)*$/, '/manifest.webapp');

    url += '#secure';
    window.dispatchEvent(new window.CustomEvent('secure-launchapp',
      {
        'detail': {
         'appURL': url,
         'appManifestURL': manifestUrl
        }
      }
    ));
  };

  LockScreen.prototype.handlePassCodeInput =
  function ls_handlePassCodeInput(key) {
    switch (key) {
      case 'e': // 'E'mergency Call
        this.invokeSecureApp('emergency-call');
        break;

      case 'c': // 'C'ancel
        // Delegate to LockScreenStateManager
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

        if (this._passcodePadVibrationEnabled) {
          navigator.vibrate(this._passcodePadVibrationDuration);
        }

        if (this.passCodeEntered.length === 4) {
          this.checkPassCode();
        }
        break;
    }
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
    var wasAlreadyUnlocked = !this.locked;
    this.locked = false;

    this.mainScreen.focus();

    // The lockscreen will be hidden, stop refreshing the clock.
    this.stopUpdateClock();

    if (wasAlreadyUnlocked) {
      return;
    }

    if (this.unlockSoundEnabled) {
      var unlockAudio = new Audio('./resources/sounds/unlock.opus');
      unlockAudio.play();
    }

    if (!detail) {
      detail = this._unlockingMessage;
    }
    this.overlay.classList.toggle('no-transition', instant);
    this.dispatchEvent('lockscreen-request-unlock', detail);
    this.dispatchEvent('secure-modeoff');
    this.overlay.classList.add('unlocked');

    // If we don't unlock instantly here,
    // these are run in transitioned callback.
    if (instant) {
      this.overlay.hidden = true;
    } else {
      this.unlockDetail = detail;
    }
    // Clear the state after we send the request.
    this._unlockingMessage = {};
  };

  LockScreen.prototype.lock =
  function ls_lock(instant) {
    var wasAlreadyLocked = this.locked;
    this.locked = true;

    this.overlay.focus();
    this.overlay.classList.toggle('no-transition', instant);

    this.overlay.classList.remove('unlocked');
    this.overlay.hidden = false;

    if (!wasAlreadyLocked) {
      if (document.mozFullScreen) {
        document.mozCancelFullScreen();
      }

      // Any changes made to this,
      // also need to be reflected in apps/system/js/storage.js
      this.dispatchEvent('secure-modeon');

      if(this._checkGenerateMaskedBackgroundColor()){
        this._generateMaskedBackgroundColor();
      }
    }
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
        var unload = (function() {
          this.overlay.classList.remove('triggered');
          clearTimeout(this.triggeredTimeoutId);
        }).bind(this);

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
    if (!this.locked) {
      return;
    }

    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    var timeFormat = this.timeFormat.replace('%p', '<span>%p</span>');
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

  /**
   * This function would fire an event to validate the passcode.
   * The validator is a component in System app, and LockScreen should
   * not validate it.
   */
  LockScreen.prototype.checkPassCode =
  function lockscreen_checkPassCode() {
    var request = {
      passcode: this.passCodeEntered,
      onsuccess: this.onPasscodeValidationSuccess.bind(this),
      onerror: this.onPasscodeValidationFailed.bind(this),
    };
    window.dispatchEvent(new CustomEvent(
      'lockscreen-request-passcode-validate',
      { detail: request }
    ));
  };

  LockScreen.prototype.updateBackground =
  function ls_updateBackground(value) {
    var background = document.getElementById('lockscreen-background'),
        url = 'url(' + value + ')';
    background.style.backgroundImage = url;
    this._shouldRegenerateMaskedBackgroundColor = true;
    this._regenerateMaskedBackgroundColorFrom = value;
  };

  /**
   * Check if we should regenerate masked background color
   */
  LockScreen.prototype._checkGenerateMaskedBackgroundColor =
  function ls_checkGenerateMaskedBackgroundColor() {
    // XXX: request animation frame?
    return (this._shouldRegenerateMaskedBackgroundColor &&
            this._regenerateMaskedBackgroundColorFrom);
  };

  /**
   * Generate a single color from wallpaper
   * to be used as the background color of Masked Background
   */
  LockScreen.prototype._generateMaskedBackgroundColor =
  function ls_generateMaskedBackgroundColor() {
    // downsample the image to avoid calculation taking too much time
    var SAMPLE_IMAGE_SIZE_BASE = 100;

    var img = new Image();
    img.onload = (function(){
      var sampleImageWidth;
      var sampleImageHeight;

      if(img.height > img.width){
        sampleImageWidth =
          Math.floor(SAMPLE_IMAGE_SIZE_BASE * window.devicePixelRatio);
        sampleImageHeight =
          Math.floor(sampleImageWidth * (img.height / img.width));
      }else{
        sampleImageHeight =
          Math.floor(SAMPLE_IMAGE_SIZE_BASE * window.devicePixelRatio);
        sampleImageWidth =
          Math.floor(sampleImageHeight * (img.width / img.height));
      }

      var canvas = document.createElement('canvas');
      canvas.width = sampleImageWidth;
      canvas.height = sampleImageHeight;

      var context = canvas.getContext('2d');
      context.drawImage(img, 0, 0, sampleImageWidth, sampleImageHeight);

      var data =
        context.getImageData(0, 0, sampleImageWidth, sampleImageHeight).data;
      var r = 0, g = 0, b = 0;

      for (var row = 0; row < sampleImageHeight; row++) {
        for (var col = 0; col < sampleImageWidth; col++) {
          r += data[((sampleImageWidth * row) + col) * 4];
          g += data[((sampleImageWidth * row) + col) * 4 + 1];
          b += data[((sampleImageWidth * row) + col) * 4 + 2];
        }
      }

      r = r / (sampleImageWidth * sampleImageHeight) / 255;
      g = g / (sampleImageWidth * sampleImageHeight) / 255;
      b = b / (sampleImageWidth * sampleImageHeight) / 255;

      // http://en.wikipedia.org/wiki/HSL_and_HSV#Formal_derivation
      var M = Math.max(r, g, b);
      var m = Math.min(r, g, b);
      var C = M - m;
      var h, s, l;

      l = 0.5 * (M + m);
      if (C === 0) {
        h = s = 0; // no satuaration (monochromatic)
      } else {
        switch (M) {
          case r:
            h = ((g - b) / C) % 6;
            break;
          case g:
            h = ((b - r) / C) + 2;
            break;
          case b:
            h = ((r - g) / C) + 4;
            break;
        }
        h *= 60;
        h = (h + 360) % 360;
        s = C / (1 - Math.abs(2 * l - 1));
      }

      l *= 0.9;

      h = parseInt(h);
      s = parseInt(s * 100) + '%';
      l = parseInt(l * 100) + '%';

      var value = 'hsla(' + h + ', ' + s + ', ' + l + ', 0.7)';
      this.maskedBackground.dataset.wallpaperColor = value;
      if (!this.maskedBackground.classList.contains('blank')) {
        this.maskedBackground.style.backgroundColor = value;
      }
    }).bind(this);

    img.src = this._regenerateMaskedBackgroundColorFrom;
    this._shouldRegenerateMaskedBackgroundColor = false;
    this._regenerateMaskedBackgroundColorFrom = undefined;
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
        'notification-arrow', 'masked-background'];

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
   * When validation failed, do UI change.
   */
  LockScreen.prototype.onPasscodeValidationFailed =
    function ls_onPasscodeValidationFailed() {
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
    };

  /**
   * When validation success, do unlock.
   */
  LockScreen.prototype.onPasscodeValidationSuccess =
    function ls_onPasscodeValidationSuccess() {
      this.passCodeError = 0;
      this.kPassCodeErrorTimeout = 500;
      this.kPassCodeErrorCounter = 0;
      this.unlock();
    };

  LockScreen.prototype.startUpdateClock = function() {
    this.clockTimerID = window.setInterval(() => {
      this.refreshClock(new Date());
    }, 60000);
  };



  LockScreen.prototype.startUpdateClock = function() {
    // Which second in this minute we're.
    var seconds = (new Date()).getSeconds();
    var leftSeconds = 60 - seconds;
    window.setTimeout(() => {
      // If seconds is 0, it would miss one minute.
      // And no matter which seconds we're, we need to refresh it first.
      this.refreshClock(new Date());
        this.clockTimerID = window.setInterval(() => {
        this.refreshClock(new Date());
      }, 60000);
    }, leftSeconds * 1000);
  };

  LockScreen.prototype.stopUpdateClock = function() {
    window.clearInterval(this.clockTimerID);
  };

  /** @exports LockScreen */
  exports.LockScreen = LockScreen;

  // XXX: Before we stop components directly reading this value,
  // we need this to satisfy those components which would be loaded
  // before this file.
  if (!window.lockScreen) {
    /** @global*/
    window.lockScreen = { locked: false };
  }
})(window);
