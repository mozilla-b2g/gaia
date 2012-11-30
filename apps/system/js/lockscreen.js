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
  * Current passcode entered by the user
  */
  passCodeEntered: '',

  /*
  * Timeout after incorrect attempt
  */
  kPassCodeErrorTimeout: 500,

  /*
  * Airplane mode
  */
  airplaneMode: false,

  /*
  * Timeout ID for backing from triggered state to normal state
  */
  triggeredTimeoutId: 0,

  /*
  * Interval ID for elastic of curve and arrow
  */
  elasticIntervalId: 0,

  /*
  * start/end curve path data (position, curve control point)
  */
  CURVE_START_DATA: 'M0,80 C100,150 220,150 320,80',
  CURVE_END_DATA: 'M0,80 C100,-20 220,-20 320,80',

  /*
  * curve transform const parameters
  */
  CURVE_TRANSFORM_DATA: ['M0,80 C100,', '0', ' 220,', '0', ' 320,80'],

  /*
  * control points coordinate y for CURVE_TRANSFORM_DATA
  */
  CURVE_TRANSFORM_Y1_INDEX: 1,
  CURVE_TRANSFORM_Y2_INDEX: 3,

  /*
  * elastic animation interval
  */
  ELASTIC_INTERVAL: 5000,

  /*
  * timeout for triggered state after swipe up
  */
  TRIGGERED_TIMEOUT: 7000,

  /* init */
  init: function ls_init() {
    this.getAllElements();

    this.lockIfEnabled(true);
    this.writeSetting(this.enabled);

    /* Status changes */
    window.addEventListener('volumechange', this);
    window.addEventListener('screenchange', this);

    /* Gesture */
    this.area.addEventListener('mousedown', this);
    this.areaCamera.addEventListener('click', this);
    this.areaUnlock.addEventListener('click', this);
    this.iconContainer.addEventListener('mousedown', this);

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

    SettingsListener.observe('wallpaper.image',
                             'resources/images/backgrounds/default.png',
                             function(value) {
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

  handleEvent: function ls_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        // XXX: If the screen is not turned off by ScreenManager
        // we would need to lock the screen again
        // when it's being turned back on
        if (!evt.detail.screenEnabled) {
          // Don't update the time after we're already locked otherwise turning
          // the screen off again will bypass the passcode before the timeout.
          if (!this.locked) {
            this._screenOffTime = new Date().getTime();
          }
        } else {
          var _screenOffInterval = new Date().getTime() - this._screenOffTime;
          if (_screenOffInterval > this.passCodeRequestTimeout * 1000) {
            this._passCodeTimeoutCheck = true;
          } else {
            this._passCodeTimeoutCheck = false;
          }
        }

        this.lockIfEnabled(true);
        break;
      case 'voicechange':
      case 'cardstatechange':
        this.updateConnState();

      case 'click':
        if (evt.target === this.areaUnlock || evt.target === this.areaCamera) {
          this.handleIconClick(evt.target);
          break;
        }

        if (!evt.target.dataset.key)
          break;

        // Cancel the default action of <a>
        evt.preventDefault();
        this.handlePassCodeInput(evt.target.dataset.key);
        break;

      case 'mousedown':
        var leftTarget = this.areaCamera;
        var rightTarget = this.areaUnlock;
        var handle = this.areaHandle;
        var overlay = this.overlay;
        var target = evt.target;

        if (target === leftTarget || target === rightTarget) {
          break;
        }

        if (overlay.classList.contains('triggered') &&
            target != leftTarget && target != rightTarget) {
          this.unloadPanel();
          break;
        }

        this.iconContainer.classList.remove('elastic');
        this.setElasticEnabled(false);
        Array.prototype.forEach.call(this.startAnimation, function(el) {
          el.endElement();
        });

        this._touch = {
          touched: false,
          leftTarget: leftTarget,
          rightTarget: rightTarget,
          overlayWidth: this.overlay.offsetWidth,
          handleWidth: this.areaHandle.offsetWidth,
          maxHandleOffset: rightTarget.offsetLeft - handle.offsetLeft -
            (handle.offsetWidth - rightTarget.offsetWidth) / 2
        };
        window.addEventListener('mouseup', this);
        window.addEventListener('mousemove', this);

        this._touch.touched = true;
        this._touch.initX = evt.pageX;
        this._touch.initY = evt.pageY;
        overlay.classList.add('touched');
        break;

      case 'mousemove':
        this.handleMove(evt.pageX, evt.pageY);
        break;

      case 'mouseup':
        var handle = this.areaHandle;
        window.removeEventListener('mousemove', this);
        window.removeEventListener('mouseup', this);

        this.handleMove(evt.pageX, evt.pageY);
        this.handleGesture();
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
          this.switchPanel();
          evt.stopImmediatePropagation();
        }
        break;

      case 'holdhome':
        if (!this.locked)
          return;

        evt.stopImmediatePropagation();
        evt.stopPropagation();
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
      overlay.classList.add('touched');
    }

    var dy = pageY - touch.initY;
    var handleMax = window.innerHeight / 4;
    var ty = Math.max(- handleMax, dy);
    var opacity = - ty / handleMax;
    // Curve control point coordinate Y
    var cy = 150 - opacity * 150;
    touch.cy = cy;
    var curvedata = [].concat(this.CURVE_TRANSFORM_DATA);
    curvedata[this.CURVE_TRANSFORM_Y1_INDEX] = cy;
    curvedata[this.CURVE_TRANSFORM_Y2_INDEX] = cy;

    this.iconContainer.style.transform = 'translateY(' + ty / 1.5 + 'px)';
    this.curvepath.setAttribute('d', curvedata.join(''));
    this.areaHandle.setAttribute('y', 100 - opacity * 100);
  },

  handleGesture: function ls_handleGesture() {
    var handleMax = window.innerHeight / 4;
    var touch = this._touch;

    if (touch.cy < 80) {
      Array.prototype.forEach.call(this.endAnimation, function(el) {
        el.setAttribute('fill', 'freeze');
        el.beginElement();
      });
      var self = this;
      this.curvepath.addEventListener('endEvent', function endEvent() {
        self.curvepath.removeEventListener('endEvent', endEvent);
        self.curvepath.setAttribute('d', self.CURVE_END_DATA);
        self.curvepath.setAttribute('stroke-opacity', 0);
        self.areaHandle.setAttribute('y', 0);
        self.areaHandle.setAttribute('opacity', 0);

        Array.prototype.forEach.call(self.endAnimation, function(el) {
          el.removeAttribute('fill');
        });
      });
      this.areaHandle.style.transform =
        this.areaHandle.style.opacity =
        this.iconContainer.style.transform =
        this.iconContainer.style.opacity = '';
      this.overlay.classList.add('triggered');

      this.triggeredTimeoutId =
        setTimeout(this.unloadPanel.bind(this), this.TRIGGERED_TIMEOUT);
    }
    else {
      this.unloadPanel();
      this.setElasticEnabled(true);
    }
  },

  handleIconClick: function ls_handleIconClick(target) {
    var self = this;
    switch (target) {
      case this.areaCamera:
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
    this.setElasticEnabled(false);

    this.mainScreen.focus();
    if (instant) {
      this.overlay.classList.add('no-transition');
      this.switchPanel();
    } else {
      this.overlay.classList.remove('no-transition');
    }

    this.mainScreen.classList.remove('locked');

    WindowManager.setOrientationForApp(WindowManager.getDisplayedApp());

    if (!wasAlreadyUnlocked) {
      // Any changes made to this,
      // also need to be reflected in apps/system/js/storage.js
      this.dispatchEvent('unlock');
      this.writeSetting(false);

      if (instant)
        return;

      if (this.unlockSoundEnabled) {
        var unlockAudio = new Audio('./resources/sounds/unlock.ogg');
        unlockAudio.play();
      }
    }
  },

  lock: function ls_lock(instant) {
    var wasAlreadyLocked = this.locked;
    this.locked = true;

    this.updateTime();

    this.switchPanel();

    this.setElasticEnabled(ScreenManager.screenEnabled);

    this.overlay.focus();
    if (instant)
      this.overlay.classList.add('no-transition');
    else
      this.overlay.classList.remove('no-transition');

    this.mainScreen.classList.add('locked');

    screen.mozLockOrientation('portrait-primary');

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
    switch (panel) {
      case 'passcode':
      case 'main':
        if (callback)
          callback();
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
        };
        this.overlay.classList.remove('no-transition');
        this.camera.appendChild(frame);

        if (callback)
          callback();
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
          Array.prototype.forEach.call(self.startAnimation, function(el) {
            el.setAttribute('fill', 'freeze');
            el.beginElement();
          });
          self.curvepath.addEventListener('endEvent', function eventend() {
            self.curvepath.removeEventListener('endEvent', eventend);
            self.curvepath.setAttribute('d', self.CURVE_START_DATA);
            self.curvepath.setAttribute('stroke-opacity', '1.0');
            self.areaHandle.setAttribute('y', 100);
            self.areaHandle.setAttribute('opacity', 1);
            Array.prototype.forEach.call(self.startAnimation, function(el) {
              el.removeAttribute('fill');
            });
          });

          self.areaHandle.style.transform =
            self.areaUnlock.style.transform =
            self.areaCamera.style.transform =
            self.iconContainer.style.transform =
            self.iconContainer.style.opacity =
            self.areaHandle.style.opacity =
            self.areaUnlock.style.opacity =
            self.areaCamera.style.opacity = '';
          self.overlay.classList.remove('triggered');
          self.areaHandle.classList.remove('triggered');
          self.areaCamera.classList.remove('triggered');
          self.areaUnlock.classList.remove('triggered');

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
      callback();
  },

  switchPanel: function ls_switchPanel(panel) {
    var overlay = this.overlay;
    var self = this;
    panel = panel || 'main';

    this.loadPanel(panel, function panelLoaded() {
      self.unloadPanel(overlay.dataset.panel, panel,
        function panelUnloaded() {
          if (overlay.dataset.panel !== panel)
            self.dispatchEvent('lockpanelchange');

          overlay.dataset.panel = panel;
        });
    });
  },

  updateTime: function ls_updateTime() {
    if (!this.locked)
      return;

    var d = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    var timeFormat = _('shortTimeFormat') || '%H:%M';
    var dateFormat = _('longDateFormat') || '%A %e %B';
    var time = f.localeFormat(d, timeFormat);
    this.clockNumbers.textContent = time.match(/([01]?\d):[0-5]\d/g);
    this.clockMeridiem.textContent = (time.match(/AM|PM/i) || []).join('');
    this.date.textContent = f.localeFormat(d, dateFormat);

    var self = this;
    window.setTimeout(function ls_clockTimeout() {
      self.updateTime();
    }, (59 - d.getSeconds()) * 1000);
  },

  updateConnState: function ls_updateConnState() {
    var conn = window.navigator.mozMobileConnection;
    if (!conn)
      return;

    var voice = conn.voice;
    var connstateLine1 = this.connstate.firstElementChild;
    var connstateLine2 = this.connstate.lastElementChild;
    var _ = navigator.mozL10n.get;

    // Reset line 2
    connstateLine2.textContent = '';

    var updateConnstateLine1 = function updateConnstateLine1(l10nId) {
      connstateLine1.dataset.l10nId = l10nId;
      connstateLine1.textContent = _(l10nId) || '';
    };

    if (this.airplaneMode) {
      updateConnstateLine1('airplaneMode');
      return;
    }

    // Possible value of voice.state are
    // 'notSearching', 'searching', 'denied', 'registered',
    // where the later three means the phone is trying to grabbing
    // the network. See
    // https://bugzilla.mozilla.org/show_bug.cgi?id=777057
    if (voice.state == 'notSearching') {
      // "No Network"
      updateConnstateLine1('noNetwork');

      return;
    }

    if (!voice.connected && !voice.emergencyCallsOnly) {
      // "Searching"
      // voice.state can be any of the later three value.
      // (it's possible, briefly that the phone is 'registered'
      // but not yet connected.)
      updateConnstateLine1('searching');

      return;
    }

    if (voice.emergencyCallsOnly) {
      switch (conn.cardState) {
        case 'absent':
          updateConnstateLine1('emergencyCallsOnlyNoSIM');

          break;

        case 'pinRequired':
          updateConnstateLine1('emergencyCallsOnlyPinRequired');

          break;

        case 'pukRequired':
          updateConnstateLine1('emergencyCallsOnlyPukRequired');

          break;

        case 'networkLocked':
          updateConnstateLine1('emergencyCallsOnlyNetworkLocked');

          break;

        default:
          updateConnstateLine1('emergencyCallsOnly');

          break;
      }

      return;
    }

    if (voice.network.mcc == 724 &&
        voice.cell && voice.cell.gsmLocationAreaCode) {
      // We are in Brazil, It is legally required to show local info
      // about current registered GSM network in a legally specified way.
      var lac = voice.cell.gsmLocationAreaCode % 100;
      var carriers = MobileInfo.brazil.carriers;
      var regions = MobileInfo.brazil.regions;

      connstateLine2.textContent =
        (carriers[voice.network.mnc] || ('724' + voice.network.mnc)) +
        ' ' +
        (regions[lac] ? regions[lac] + ' ' + lac : '');
    }

    var carrierName = voice.network.shortName || voice.network.longName;

    if (voice.roaming) {
      var l10nArgs = { operator: carrierName };
      connstateLine1.dataset.l10nId = 'roaming';
      connstateLine1.dataset.l10nArgs = JSON.stringify(l10nArgs);
      connstateLine1.textContent = _('roaming', l10nArgs);

      return;
    }

    delete connstateLine1.dataset.l10nId;
    connstateLine1.textContent = carrierName;
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

      this.unlock();
    } else {
      this.overlay.dataset.passcodeStatus = 'error';
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

  getAllElements: function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['connstate', 'mute', 'clock-numbers', 'clock-meridiem',
        'date', 'area', 'area-unlock', 'area-camera', 'icon-container',
        'area-handle', 'passcode-code', 'curvepath',
        'passcode-pad', 'camera', 'accessibility-camera',
        'accessibility-unlock', 'panel-emergency-call'];
    var elementsForClass = ['start-animation', 'end-animation',
        'elastic-animation'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    elements.forEach((function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById('lockscreen-' + name);
    }).bind(this));

    elementsForClass.forEach((function createElementsRef(name) {
      this[toCamelCase(name)] =
        document.querySelectorAll('.lockscreen-' + name);
    }).bind(this));

    this.overlay = document.getElementById('lockscreen');
    this.mainScreen = document.getElementById('screen');
  },

  dispatchEvent: function ls_dispatchEvent(name) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(name, true, true, null);
    window.dispatchEvent(evt);
  },

  writeSetting: function ls_writeSetting(value) {
    if (!window.navigator.mozSettings)
      return;

    SettingsListener.getSettingsLock().set({
      'lockscreen.locked': value
    });
  },

  setElasticEnabled: function ls_setElasticEnabled(value) {
    if (value && !this.elasticIntervalId) {
      this.elasticIntervalId =
        setInterval(this.playElastic.bind(this), this.ELASTIC_INTERVAL);
    }
    else if (!value && this.elasticIntervalId) {
      clearInterval(this.elasticIntervalId);
      this.elasticIntervalId = 0;
    }
  },

  playElastic: function ls_playElastic() {
    if (this._touch && this._touch.touched)
      return;
    var forEach = Array.prototype.forEach;
    forEach.call(this.elasticAnimation, function(el) {
      el.beginElement();
    });
    this.overlay.classList.add('elastic');

    this.iconContainer.addEventListener('animationend',
      function animationend() {
        this.iconContainer.removeEventListener('animationend', animationend);
        this.overlay.classList.remove('elastic');
      }.bind(this));
  }
};

LockScreen.init();
