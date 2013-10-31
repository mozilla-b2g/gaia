/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var LockScreen = {
  /*
  * Boolean return true when initialized.
  */
  ready: false,

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
  * Boolean returns wether we want a sound effect when unlocking.
  */
  unlockSoundEnabled: true,

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
  * Detect if sliding crossed the middle line.
  */
  _slidingToward: '',

  /*
  * How long did the user slide.
  */
  _slideCount: 0,

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
  * Airplane mode
  */
  airplaneMode: false,

  /*
  * Timeout ID for backing from triggered state to normal state
  */
  triggeredTimeoutId: 0,

  /*
  * Interval ID for elastic of curve and arrow (null means the animation is
  * not running).
  */
  elasticIntervalId: null,

  /*
  * True if the animation should be running right now.
  */
  elasticEnabled: false,

  /*
  * elastic animation interval
  */
  ELASTIC_INTERVAL: 5000,

  /*
  * timeout for triggered state after swipe up
  */
  TRIGGERED_TIMEOUT: 7000,

  /*
  * Max value for handle swiper up
  */
  HANDLE_MAX: 70,

  /*
  * Types of 2G Networks
  */
  NETWORKS_2G: ['gsm', 'gprs', 'edge'],

  /**
   * Object used for handling the clock UI element, wraps all related timers
   */
  clock: new Clock(),

  /**
   * Some additional information about other global data entries bound on
   * DOM elements:
   *
   * (We can't find a suitable place to put in these information, because
   *  we even doesn't get the elements directly. See `getAllElements`.)
   *
   * // If user input the correct passcode or not.
   * // Undefined by deleting it means there is no passcode had been inputted.
   * //
   * // 'success' | 'error' | undefined
   * overlay.dataset.passcodeStatus
   *
   * // The current panel.
   * // Undefined actually means the main panel.
   * //
   * // 'camera' | 'main' | 'passcode' | 'emergency-call' | undefined
   * overlay.dataset.panel
   *
   * @this
   */

  /* init */
  init: function ls_init() {
    if (this.ready) { // already initialized: just trigger a translation
      this.refreshClock(new Date());
      this.updateConnState();
      return;
    }
    this.ready = true;

    this.getAllElements();

    this.lockIfEnabled(true);
    this.writeSetting(this.enabled);

    /* Status changes */
    window.addEventListener('volumechange', this);
    window.addEventListener('screenchange', this);
    document.addEventListener('visibilitychange', this);

    /* Telephony changes */
    if (navigator.mozTelephony) {
      navigator.mozTelephony.addEventListener('callschanged', this);
    }

    /* Gesture */
    this.area.addEventListener('touchstart', this);
    this.areaCamera.addEventListener('click', this);
    this.areaUnlock.addEventListener('click', this);
    this.altCamera.addEventListener('touchstart', this);
    this.iconContainer.addEventListener('touchstart', this);

    /* Unlock & camera panel clean up */
    this.overlay.addEventListener('transitionend', this);

    /* Passcode input pad*/
    this.passcodePad.addEventListener('click', this);

    /* switching panels */
    window.addEventListener('home', this);

    /* blocking holdhome and prevent Cards View from show up */
    window.addEventListener('holdhome', this, true);

    /* mobile connection state on lock screen */
    var conn = window.navigator.mozMobileConnection;
    if (conn && conn.voice) {
      conn.addEventListener('voicechange', this);
      this.updateConnState();
      this.connstate.hidden = false;
    }

    /* icc state on lock screen */
    if (IccHelper.enabled) {
      IccHelper.addEventListener('cardstatechange', this);
      IccHelper.addEventListener('iccinfochange', this);
    }

    var self = this;

    SettingsListener.observe('lockscreen.enabled', true, function(value) {
      self.setEnabled(value);
    });

    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      self.airplaneMode = value;
      self.updateConnState();
    });

    var wallpaperURL = new SettingsURL();

    SettingsListener.observe('wallpaper.image',
                             'resources/images/backgrounds/default.png',
                             function(value) {
                               self.updateBackground(wallpaperURL.set(value));
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

    SettingsListener.observe('lockscreen.unlock-sound.enabled',
      true, function(value) {
      self.setUnlockSoundEnabled(value);
    });

    SettingsListener.observe('lockscreen.passcode-lock.timeout',
      0, function(value) {
      self.passCodeRequestTimeout = value;
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

  setUnlockSoundEnabled: function ls_setUnlockSoundEnabled(val) {
    if (typeof val === 'string') {
      this.unlockSoundEnabled = val == 'false' ? false : true;
    } else {
      this.unlockSoundEnabled = val;
    }
  },

  lightIcons: function() {
    this.rightIcon.classList.remove('dark');
    this.leftIcon.classList.remove('dark');
  },

  darkIcons: function() {
    this.rightIcon.classList.add('dark');
    this.leftIcon.classList.add('dark');
  },

  handleEvent: function ls_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        // Don't lock if screen is turned off by promixity sensor.
        if (evt.detail.screenOffBy == 'proximity') {
          break;
        }

        // If the screen got blackout, should restore the slide.
        this.restoreSlide();
        this.slideLeft.classList.remove('touched');
        this.slideCenter.classList.remove('touched');
        this.slideRight.classList.remove('touched');

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
          if (this.camera.firstElementChild)
            this.camera.removeChild(this.camera.firstElementChild);

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

        this.lockIfEnabled(true);
        break;

      case 'voicechange':
      case 'cardstatechange':
      case 'iccinfochange':
        this.updateConnState();
        break;

      case 'click':
        if (evt.mozInputSource === 0 &&
            (evt.target === this.areaUnlock ||
             evt.target === this.areaCamera)) {
          evt.preventDefault();
          this.handleIconClick(evt.target);
          break;
        }

        if (!evt.target.dataset.key)
          break;

        // Cancel the default action of <a>
        evt.preventDefault();
        this.handlePassCodeInput(evt.target.dataset.key);
        break;

      case 'touchstart':
        if (evt.target === this.altCamera) {
          evt.preventDefault();
          this.handleIconClick(evt.target);
          break;
        }

        if (evt.target === this.area ||
            evt.target === this.areaUnlock ||
            evt.target === this.areaCamera)
          this.handleSlideBegin();

        var leftTarget = this.areaCamera;
        var rightTarget = this.areaUnlock;
        var overlay = this.overlay;
        var target = evt.target;

        this._touch = {
          touched: false,
          leftTarget: leftTarget,
          rightTarget: rightTarget,
          overlayWidth: this.overlay.offsetWidth
        };
        window.addEventListener('touchend', this);
        window.addEventListener('touchmove', this);

        this._touch.touched = true;
        this._touch.initX = evt.touches[0].pageX;
        this._touch.initY = evt.touches[0].pageY;
        overlay.classList.add('touched');
        break;

      case 'touchmove':
        this.handleMove(
          evt.touches[0].pageX,
          evt.touches[0].pageY
        );
        this.handleSlide();
        break;

      case 'touchend':
        window.removeEventListener('touchmove', this);
        window.removeEventListener('touchend', this);

        this.handleSlideEnd();

        this.handleMove(
          evt.changedTouches[0].pageX,
          evt.changedTouches[0].pageY
        );
        delete this._touch;
        this.overlay.classList.remove('touched');

        break;

      case 'transitionend':
        if (evt.target !== this.overlay)
          return;

        if (this.overlay.dataset.panel !== 'camera' &&
            this.camera.firstElementChild) {
          this.camera.removeChild(this.camera.firstElementChild);
        }

        if (!this.locked)
          this.switchPanel();
        break;

      case 'home':
        if (this.locked) {
          if (this.passCodeEnabled) {
            this.switchPanel('passcode');
          } else {
            this.switchPanel();
          }
          evt.stopImmediatePropagation();
        }
        break;

      case 'holdhome':
        if (!this.locked)
          return;

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
        if (this.locked)
          this.switchPanel();
        break;
    }
  },

  handleMove: function ls_handleMove(pageX, pageY) {
    var touch = this._touch;

    if (!touch.touched) {

      // Do nothing if the user have not move the finger to the slide yet.
      if (!this._sliding)
        return;

      touch.touched = true;
      touch.initX = pageX;
      touch.initY = pageY;

      var overlay = this.overlay;
      overlay.classList.add('touched');
    }

    var dy = pageY - touch.initY;
    var ty = Math.max(- this.HANDLE_MAX, dy);
    var base = - ty / this.HANDLE_MAX;
    touch.ty = ty;

    touch.tx = pageX - touch.initX;
  },

  handleSlideBegin: function() {
    this.lightIcons();
    this.restoreSlide();
    this._sliding = true;

    // The '0.5' is the original width of the center of the circle.
    this._slideOrigin = this.slideCenter.offsetLeft + 0.5;
  },

  handleSlide: function() {

    if (!this._sliding)
      return;

    /**
     * Return the distance between the end of the handle to the origin.
     *
     * @return {Pixel} the length of the handle dragged from the origin.
     * @this
     */
    var slidingLength = function ls_hs_slidingLength(subject, dir) {
      if ('right' === dir) {
        return subject.offsetLeft + subject.clientWidth - this._slideOrigin;
      } else {
        return this._slideOrigin - subject.offsetLeft + subject.clientWidth;
      }
    };

    var tx = this._touch.tx;
    var dir = 'right';
    if (0 > tx)
      var dir = 'left';

    // Drag from left to right or counter-direction.
    if ('' !== this._slidingToward && dir !== this._slidingToward) {
      this.restoreSlide();
      this._sliding = true;
    }
    this._slidingToward = dir;

    // Unsigned.
    var utx = Math.abs(tx);

    var trackLength = this.rightIcon.offsetLeft -
                      this.leftIcon.offsetLeft +
                      this.rightIcon.clientWidth;

    var natureBoundary = Math.floor(trackLength / 2);

    // Shrink the boundaries.
    var slideBoundaryOffset = this.leftIcon.clientWidth;

    // They're different because the center element of the circle
    // occurs 1px width toward right.
    var boundaryBorderRight = 5;
    var boundaryBorderLeft = 4;
    var boundaryBorder = 'left' === dir ? boundaryBorderLeft :
      boundaryBorderRight;

    // Boundaries will shorter than the track length,
    // to make unlocking with one hand easier.
    var maxLength = natureBoundary -
                    slideBoundaryOffset +
                    Math.floor(this.leftIcon.clientWidth / 2);

    var offset = utx;
    var slideLength = offset + this.slideLeft.clientWidth + boundaryBorder;

    // Start to paint the slide.
    this.slideLeft.classList.add('pulling');
    this.slideRight.classList.add('pulling');

    // If the front-end slide reached the boundary.
    // We plus and minus the icon width because maxLength should be fixed,
    // and only the handle and the blue occurred area should be adjusted.
    if (slideLength > maxLength) {
      this._slideReachEnd = true;
      offset = natureBoundary - this.slideLeft.clientWidth - boundaryBorder;
      this._slideTo(offset, dir, true);
    } else {
      this._slideTo(offset, dir);
      this._slideReachEnd = false;
    }
    this._slideCount += utx;
    if (this._slideCount > 15) {

      // Add the effects to these icons.
      this.slideLeft.classList.add('touched');
      this.slideCenter.classList.add('touched');
      this.slideRight.classList.add('touched');
    }
    this._slideCount = 0;
  },

  // Restore all elements in the slide.
  //
  // easing {Boolean} true|undefined to bounce back slowly.
  restoreSlide: function(easing) {

    // Mimic the `getAllElements` function...
    [this.slideLeft, this.slideRight, this.slideCenter]
      .forEach(function ls_rSlide(h) {
        if (easing) {

          // To prevent magic numbers...
          var bounceBackTime = '0.3s';

          // Add transition to let it bounce back slowly.
          h.style.transition = 'transform ' + bounceBackTime + ' ease 0s';

          var tsEnd = function ls_tsEnd(evt) {

            h.style.transition = 'none';

            // Remove the effects to these icons, and only do it
            // when it bounce back.
            //
            // This is because crossing the origin will restore it as well,
            // but we don't need to reset the blue are at such scenario.
            h.classList.remove('touched');
            h.removeEventListener('transitionend', tsEnd);
          };
          h.addEventListener('transitionend', tsEnd);

        } else {
          h.style.transition = '';
        }

        // After setup, bounce it back.
        h.style.transform = '';
    });

    this._sliding = false;
    this._slideReachEnd = false;
  },

  handleSlideEnd: function() {
    // Bounce back to the center immediately.
    if (false === this._slideReachEnd) {
      this.restoreSlide(true);
    } else {
      // Restore it only after screen changed.
      var appLaunchDelay = 400;
      setTimeout(this.restoreSlide.bind(this, true), appLaunchDelay);
      this.handleIconClick('left' === this._slidingToward ?
        this.leftIcon : this.rightIcon);
    }
    this.darkIcons();
    this._slideCount = 0;
    this._sliding = false;
  },

  handleIconClick: function ls_handleIconClick(target) {
    var self = this;
    switch (target) {
      case this.areaCamera:
      case this.altCamera:
        var panelOrFullApp = function panelOrFullApp() {
          // If the passcode is enabled and it has a timeout which has passed
          // switch to secure camera
          if (self.passCodeEnabled && self._passCodeTimeoutCheck) {
            // Go to secure camera panel
            self.switchPanel('camera');
            return;
          }

          self.unlock(/* instant */ null, /* detail */ { areaCamera: true });

          var a = new MozActivity({
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
        break;

      case this.areaUnlock:
        var passcodeOrUnlock = function passcodeOrUnlock() {
          if (!self.passCodeEnabled || !self._passCodeTimeoutCheck) {
            self.unlock();
          } else {
            self.switchPanel('passcode');
          }
        };
        passcodeOrUnlock();
        break;
    }
  },

  handlePassCodeInput: function ls_handlePassCodeInput(key) {
    switch (key) {
      case 'e': // 'E'mergency Call
        this.switchPanel('emergency-call');
        break;

      case 'c': // 'C'ancel
        this.switchPanel();
        break;

      case 'b': // 'B'ackspace for correction
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
    if (FtuLauncher && FtuLauncher.isFtuRunning()) {
      this.unlock(instant);
      return;
    }

    if (this.enabled) {
      this.lock(instant);
    } else {
      this.unlock(instant);
    }
  },

  unlock: function ls_unlock(instant, detail) {
    // This file is loaded before the Window Manager in order to intercept
    // hardware buttons events. As a result WindowManager is not defined when
    // the device is turned on and this file is loaded.
    var currentApp =
      'WindowManager' in window ? WindowManager.getDisplayedApp() : null;

    var currentFrame = null;

    if (currentApp) {
      currentFrame = WindowManager.getAppFrame(currentApp).firstChild;
      WindowManager.setOrientationForApp(currentApp);
    }

    var wasAlreadyUnlocked = !this.locked;
    this.locked = false;

    var repaintTimeout = 0;
    var nextPaint = (function() {
      clearTimeout(repaintTimeout);

      if (currentFrame)
        currentFrame.removeNextPaintListener(nextPaint);


      if (instant) {
        this.overlay.classList.add('no-transition');
        this.switchPanel();
      } else {
        this.overlay.classList.remove('no-transition');
      }

      this.mainScreen.classList.remove('locked');

      if (!wasAlreadyUnlocked) {
        // Any changes made to this,
        // also need to be reflected in apps/system/js/storage.js
        this.dispatchEvent('unlock', detail);
        this.writeSetting(false);

        if (instant)
          return;

        if (this.unlockSoundEnabled) {
          var unlockAudio = new Audio('./resources/sounds/unlock.ogg');
          unlockAudio.play();
        }
      }
    }).bind(this);

    if (currentFrame)
      currentFrame.addNextPaintListener(nextPaint);

    repaintTimeout = setTimeout(function ensureUnlock() {
      nextPaint();
    }, 200);

    this.mainScreen.focus();
    this.dispatchEvent('will-unlock');

    // The lockscreen will be hidden, stop refreshing the clock.
    this.clock.stop();
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
    screen.mozLockOrientation(ScreenLayout.defaultOrientation);

    if (!wasAlreadyLocked) {
      if (document.mozFullScreen)
        document.mozCancelFullScreen();

      // Any changes made to this,
      // also need to be reflected in apps/system/js/storage.js
      this.dispatchEvent('lock');
      this.writeSetting(true);
    }
  },

  loadPanel: function ls_loadPanel(panel, callback) {
    this._loadingPanel = true;
    switch (panel) {
      case 'passcode':
      case 'main':
        if (callback)
          setTimeout(callback);
        break;

      case 'emergency-call':
        // create the <iframe> and load the emergency call
        var frame = document.createElement('iframe');

        frame.src = './emergency-call/index.html';
        frame.onload = function emergencyCallLoaded() {
          if (callback)
            callback();
        };
        this.panelEmergencyCall.appendChild(frame);

        break;

      case 'camera':
        // create the <iframe> and load the camera
        var frame = document.createElement('iframe');

        frame.src = './camera/index.html';
        var mainScreen = this.mainScreen;
        frame.onload = function cameraLoaded() {
          mainScreen.classList.add('lockscreen-camera');
          if (callback)
            callback();
        };
        this.overlay.classList.remove('no-transition');
        this.camera.appendChild(frame);

        break;
    }
  },

  unloadPanel: function ls_unloadPanel(panel, toPanel, callback) {
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
        this.mainScreen.classList.remove('lockscreen-camera');
        break;

      case 'emergency-call':
        var ecPanel = this.panelEmergencyCall;
        ecPanel.addEventListener('transitionend', function unloadPanel() {
          ecPanel.removeEventListener('transitionend', unloadPanel);
          ecPanel.removeChild(ecPanel.firstElementChild);
        });
        break;

      case 'main':
      default:
        var self = this;
        var unload = function unload() {
          self.overlay.classList.remove('triggered');
          clearTimeout(self.triggeredTimeoutId);
        };

        if (toPanel !== 'camera') {
          unload();
          break;
        }

        this.overlay.addEventListener('transitionend',
          function ls_unloadDefaultPanel(evt) {
            if (evt.target !== this)
              return;

            self.overlay.removeEventListener('transitionend',
                                             ls_unloadDefaultPanel);
            unload();
          }
        );

        break;
    }

    if (callback)
      setTimeout(callback);
  },

  /**
   * Switch the panel to the target type.
   * Will actually call the load and unload panel function.
   *
   * @param {PanelType} panel Could be 'camera', 'passcode', 'emergency-call' or
   *                          undefined. Undefined means the main panel.
   * @this
   */
  switchPanel: function ls_switchPanel(panel) {
    if (this._switchingPanel) {
      return;
    }

    panel = panel || 'main';
    var overlay = this.overlay;
    var currentPanel = overlay.dataset.panel;

    if (currentPanel && currentPanel === panel) {
      return;
    }

    var self = this;

    this._switchingPanel = true;
    this.loadPanel(panel, function panelLoaded() {
      self.unloadPanel(overlay.dataset.panel, panel,
        function panelUnloaded() {
          self.dispatchEvent('lockpanelchange', { 'panel': panel });

          overlay.dataset.panel = panel;
          self._switchingPanel = false;
        });
    });
  },

  refreshClock: function ls_refreshClock(now) {
    if (!this.locked)
      return;

    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    var timeFormat = _('shortTimeFormat');
    var dateFormat = _('longDateFormat');
    var time = f.localeFormat(now, timeFormat);
    this.clockNumbers.textContent = time.match(/([012]?\d).[0-5]\d/g);
    this.clockMeridiem.textContent = (time.match(/AM|PM/i) || []).join('');
    this.date.textContent = f.localeFormat(now, dateFormat);
  },

  updateConnState: function ls_updateConnState() {
    var conn = window.navigator.mozMobileConnection;
    if (!conn)
      return;

    if (!IccHelper.enabled)
      return;

    navigator.mozL10n.ready(function() {
      var connstateLine1 = this.connstate.firstElementChild;
      var connstateLine2 = this.connstate.lastElementChild;
      var _ = navigator.mozL10n.get;

      var updateConnstateLine1 = function updateConnstateLine1(l10nId) {
        connstateLine1.dataset.l10nId = l10nId;
        connstateLine1.textContent = _(l10nId) || '';
      };

      var self = this;
      var updateConnstateLine2 = function updateConnstateLine2(l10nId) {
        if (l10nId) {
          self.connstate.classList.add('twolines');
          connstateLine2.dataset.l10nId = l10nId;
          connstateLine2.textContent = _(l10nId) || '';
        } else {
          self.connstate.classList.remove('twolines');
          delete(connstateLine2.dataset.l10nId);
          connstateLine2.textContent = '';
        }
      };

      // Reset line 2
      updateConnstateLine2();

      if (this.airplaneMode) {
        updateConnstateLine1('airplaneMode');
        return;
      }

      var voice = conn.voice;

      // Possible value of voice.state are:
      // 'notSearching', 'searching', 'denied', 'registered',
      // where the latter three mean the phone is trying to grab the network.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=777057
      if ('state' in voice && voice.state == 'notSearching') {
        updateConnstateLine1('noNetwork');
        return;
      }

      if (!voice.connected && !voice.emergencyCallsOnly) {
        // "Searching"
        // voice.state can be any of the latter three values.
        // (it's possible that the phone is briefly 'registered'
        // but not yet connected.)
        updateConnstateLine1('searching');
        return;
      }

      if (voice.emergencyCallsOnly) {
        updateConnstateLine1('emergencyCallsOnly');

        switch (IccHelper.cardState) {
          case 'unknown':
            updateConnstateLine2('emergencyCallsOnly-unknownSIMState');
            break;

          case 'absent':
            updateConnstateLine2('emergencyCallsOnly-noSIM');
            break;

          case 'pinRequired':
            updateConnstateLine2('emergencyCallsOnly-pinRequired');
            break;

          case 'pukRequired':
            updateConnstateLine2('emergencyCallsOnly-pukRequired');
            break;

          case 'networkLocked':
            updateConnstateLine2('emergencyCallsOnly-networkLocked');
            break;

          case 'serviceProviderLocked':
            updateConnstateLine2('emergencyCallsOnly-serviceProviderLocked');
            break;

          case 'corporateLocked':
            updateConnstateLine2('emergencyCallsOnly-corporateLocked');
            break;

          default:
            updateConnstateLine2();
            break;
        }
        return;
      }

      var operatorInfos = MobileOperator.userFacingInfo(conn);
      var is2G = this.NETWORKS_2G.some(function checkConnectionType(elem) {
        return (conn.voice.type == elem);
      });
      if (this.cellbroadcastLabel && is2G) {
        self.connstate.classList.add('twolines');
        connstateLine2.textContent = this.cellbroadcastLabel;
      } else if (operatorInfos.carrier) {
        self.connstate.classList.add('twolines');
        connstateLine2.textContent = operatorInfos.carrier + ' ' +
          operatorInfos.region;
      }

      var operator = operatorInfos.operator;

      if (voice.roaming) {
        var l10nArgs = { operator: operator };
        connstateLine1.dataset.l10nId = 'roaming';
        connstateLine1.dataset.l10nArgs = JSON.stringify(l10nArgs);
        connstateLine1.textContent = _('roaming', l10nArgs);

        return;
      }

      delete connstateLine1.dataset.l10nId;
      connstateLine1.textContent = operator;
    }.bind(this));
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
      var self = this;
      this.overlay.dataset.passcodeStatus = 'success';
      this.passCodeError = 0;
      this.kPassCodeErrorTimeout = 500;
      this.kPassCodeErrorCounter = 0;

      var transitionend = function() {
        self.passcodeCode.removeEventListener('transitionend', transitionend);
        self.unlock();
      };
      this.passcodeCode.addEventListener('transitionend', transitionend);
    } else {
      this.overlay.dataset.passcodeStatus = 'error';
      this.kPassCodeErrorCounter++;
      //double delay if >5 failed attempts
      if (this.kPassCodeErrorCounter > 5) {
        this.kPassCodeErrorTimeout = 2 * this.kPassCodeErrorTimeout;
      }
      if ('vibrate' in navigator)
        navigator.vibrate([50, 50, 50]);

      var self = this;
      setTimeout(function error() {
        delete self.overlay.dataset.passcodeStatus;
        self.passCodeEntered = '';
        self.updatePassCodeUI();
      }, this.kPassCodeErrorTimeout);
    }
  },

  updateBackground: function ls_updateBackground(value) {
    var panels = document.querySelectorAll('.lockscreen-panel');
    var url = 'url(' + value + ')';
    for (var i = 0; i < panels.length; i++) {
      panels[i].style.backgroundImage = url;
    }
  },

  /**
   * To get all elements this component will use.
   * Note we do a name mapping here: DOM variables named like 'passcodePad'
   * are actually corresponding to the lowercases with hyphen one as
   * 'passcode-pad', then be prefixed with 'lookscreen'.
   *
   * @this
   */
  getAllElements: function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['connstate', 'clock-numbers', 'clock-meridiem',
        'date', 'area', 'area-unlock', 'area-camera', 'icon-container',
        'area-handle', 'area-slide', 'passcode-code', 'alt-camera',
        'alt-camera-button', 'slide-handle',
        'passcode-pad', 'camera', 'accessibility-camera',
        'accessibility-unlock', 'panel-emergency-call'];

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

    this.slideLeft = this.slideHandle.getElementsByTagName('div')[0];
    this.slideCenter = this.slideHandle.getElementsByTagName('div')[1];
    this.slideRight = this.slideHandle.getElementsByTagName('div')[2];

    var slcLeft = '#lockscreen-icon-container .lockscreen-icon-left';
    var slcRight = '#lockscreen-icon-container .lockscreen-icon-right';
    this.leftIcon = document.querySelector(slcLeft);
    this.rightIcon = document.querySelector(slcRight);
  },

  dispatchEvent: function ls_dispatchEvent(name, detail) {
    var evt = document.createEvent('CustomEvent');
    var evt = new CustomEvent(name, {
      'bubbles': true,
      'cancelable': true,
      // Set event detail if needed for the specific event 'name' (relevant for
      // passing which button triggered the event)
      'detail': detail
    });
    window.dispatchEvent(evt);
  },

  writeSetting: function ls_writeSetting(value) {
    if (!window.navigator.mozSettings)
      return;

    SettingsListener.getSettingsLock().set({
      'lockscreen.locked': value
    });
  },

  stopElasticTimer: function ls_stopElasticTimer() {
    // Stop the timer if its running.
    if (this.elasticIntervalId != null) {
      clearInterval(this.elasticIntervalId);
      this.elasticIntervalId = null;
    }
  },

  startElasticTimer: function ls_startElasticTimer() {
    this.elasticIntervalId =
      setInterval(this.playElastic.bind(this), this.ELASTIC_INTERVAL);
  },

  setElasticEnabled: function ls_setElasticEnabled(value) {
    // Remember the state we want to be in.
    this.elasticEnabled = value;
    // If the timer is already running, stop it.
    this.stopElasticTimer();
    // If the document is visible, go ahead and start the timer now.
    if (value && !document.hidden) {
      this.startElasticTimer();
    }
  },

  playElastic: function ls_playElastic() {
    if (this._touch && this._touch.touched)
      return;

    var overlay = this.overlay;
    var container = this.iconContainer;

    container.addEventListener('animationend', function animationend(e) {
      container.removeEventListener(e.type, animationend);
    });
  },

  // Used by CellBroadcastSystem to notify the lockscreen of
  // any incoming CB messages that need to be displayed.
  setCellbroadcastLabel: function ls_setCellbroadcastLabel(label) {
    this.cellbroadcastLabel = label;
    this.updateConnState();
  },

  /**
   * Pull the handle of the slide to the position corresponding
   * to the offset.
   *
   * @param {Number} offset: pixels; how long the handle should move.
   * @param {DOM Element} subject: the handle.
   * @param {'right'|'left'} dir
   * @param {Boolean} easing: if the pulling must go with animation.
   * @this
   */
  _slideTo: function ls__slideTo(offset, dir, easing) {
    var easingSec = 0.5;

    // XXX: To solve the odd glitches among these 3 elements.
    // Make the center element scale more.
    var glitchS = 1.8;

    var subject = ('right' === dir) ? this.slideRight : this.slideLeft;
    var cntsubject = ('right' === dir) ? this.slideLeft : this.slideRight;

    subject.style.transition = (!easing) ? '' :
      'ease ' + easingSec + 's';
    cntsubject.style.transition = (!easing) ? '' :
      'ease ' + easingSec + 's';
    this.slideCenter.style.transition = (!easing) ? '' :
      'ease ' + easingSec + 's';

    // Need to set this to let transition event triggered while
    // we bounce the handles back.
    // @see `restoreSlide`
    cntsubject.style.transform = 'translateX(0px) ';

    // 'translateX' will move it according to the left border.
    if ('right' === dir) {
      subject.style.transform = 'translateX(' + offset + 'px) ';
    } else {
      subject.style.transform = 'translateX(-' + offset + 'px) ';
    }
    // Move center as long as half of the offset, then scale it.
    var cMove = offset / 2;
    var cScale = offset + glitchS;

    if ('right' === dir) {
      this.slideCenter.style.transform = 'translateX(' + cMove + 'px) ';
    } else {
      this.slideCenter.style.transform = 'translateX(-' + cMove + 'px) ';
    }
    this.slideCenter.style.transform += 'scaleX(' + cScale + ') ';
  }
};

// Bug 836195 - [Homescreen] Dock icons drop down in the UI
// consistently when using a lockcode and visiting camera
LockScreen.init();

navigator.mozL10n.ready(LockScreen.init.bind(LockScreen));

