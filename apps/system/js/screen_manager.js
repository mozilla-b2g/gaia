/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ScreenManager = {
  /*
  * return the current screen status
  * Must not mutate directly - use toggleScreen/turnScreenOff/turnScreenOn.
  * Listen to 'screenchange' event to properly handle status changes
  * This value can be "out of sync" with real mozPower value,
  * we do this to give screen some time to flash before actual turn off.
  */
  screenEnabled: false,

  /*
  * before idle-screen-off, invoke a nice dimming to the brightness
  * to notify the user that the screen is about to be turn off.
  * The user can cancel the idle-screen-off by touching the screen
  * and by pressing a button (trigger onactive callback on Idle API)
  *
  */
  _inTransition: false,

  /*
  * Idle API controls the value of this Boolean.
  * Together with wake lock, this would decide whether to turn off
  * the screen when wake lock is released
  *
  */
  _idled: false,

  /*
  * Whether the wake lock is enabled or not
  */
  _screenWakeLocked: false,

  /*
  * Whether the device light is enabled or not
  * sync with setting 'screen.automatic-brightness'
  */
  _deviceLightEnabled: true,

  /*
  * Preferred brightness without considering device light nor dimming
  * sync with setting 'screen.brightness'
  */
  _brightness: 1,

  /*
  * Wait for _dimNotice milliseconds during idle-screen-off
  */
  _dimNotice: 10 * 1000,

  init: function scm_init() {
    /* Allow others to cancel the keyup event but not the keydown event */
    window.addEventListener('keydown', this, true);
    window.addEventListener('keyup', this);

    this.screen = document.getElementById('screen');
    this.screen.classList.remove('screenoff');

    var self = this;
    var power = navigator.mozPower;

    power.addWakeLockListener(function scm_handleWakeLock(topic, state) {
      switch (topic) {
        case 'screen':
          self._screenWakeLocked = (state == 'locked-foreground');

          if (self._screenWakeLocked) {
            // Turn screen on if wake lock is acquire
            self.turnScreenOn();
          } else if (self._idled) {
            // Turn screen off if we are already idled
            // and wake lock is released
            self.turnScreenOff(false);
          }
          break;

        case 'cpu':
          power.cpuSleepAllowed = (state != 'locked-foreground' &&
                                   state != 'locked-background');
          break;

        case 'wifi':
          // Do we need to do anything in Gaia?
          break;
      }
    });

    // When idled, trigger the idle-screen-off process
    this.idleObserver.onidle = function scm_onidle() {
      self._idled = true;
      if (!self._screenWakeLocked)
        self.turnScreenOff(false);
    };

    // When active, cancel the idle-screen-off process
    this.idleObserver.onactive = function scm_onactive() {
      self._idled = false;
      if (self._inTransition) {
        self._inTransition = false;
        navigator.mozPower.screenBrightness = self._brightness;
      }
    };

    SettingsListener.observe('screen.timeout', 60,
    function screenTimeoutChanged(value) {
      self.setIdleTimeout(value);
    });

    SettingsListener.observe('screen.automatic-brightness', true,
    function deviceLightSettingChanged(value) {
      if (typeof value === 'string')
        value = (value == 'true');

      self.setDeviceLightEnabled(value);
    });

    SettingsListener.observe('screen.brightness', 1,
    function brightnessSettingChanged(value) {
      if (typeof value === 'string')
        value = parseFloat(value);

      self.setBrightness(value);
    });

    self.turnScreenOn();
  },

  handleEvent: function scm_handleEvent(evt) {
    switch (evt.type) {
      case 'devicelight':
        if (!this._deviceLightEnabled || !this.screenEnabled ||
            this._inTransition)
          return;

        // This is a rather naive but pretty effective heuristic
        var brightness =
          Math.max(Math.min((evt.value / 1100), this._brightness), 0.2);
        navigator.mozPower.screenBrightness = brightness;

        break;

      case 'mozfullscreenchange':
        if (document.mozFullScreen) {
          this.screen.classList.add('fullscreen');
        } else {
          this.screen.classList.remove('fullscreen');
        }
        break;

      // The screenshot module also listens for the SLEEP key and
      // may call preventDefault() on the keyup and keydown events.
      case 'keydown':
        if (evt.keyCode !== evt.DOM_VK_SLEEP &&
            evt.keyCode !== evt.DOM_VK_HOME) {
          return;
        }

        this._turnOffScreenOnKeyup = true;

        if (this._inTransition || evt.defaultPrevented ||
            !this.screenEnabled) {
          this._turnOffScreenOnKeyup = false;
        }

        this.turnScreenOn();
        break;

      case 'keyup':
        if (this.screenEnabled && this._turnOffScreenOnKeyup &&
            evt.keyCode == evt.DOM_VK_SLEEP && !evt.defaultPrevented &&
            !this._screenWakeLocked)
          this.turnScreenOff(true);
        break;
    }
  },

  toggleScreen: function scm_toggleScreen() {
    if (this.screenEnabled) {
      this.turnScreenOff();
    } else {
      this.turnScreenOn();
    }
  },

  turnScreenOff: function scm_turnScreenOff(instant) {
    if (!this.screenEnabled)
      return false;

    window.removeEventListener('devicelight', this);
    window.removeEventListener('mozfullscreenchange', this);

    var self = this;
    var screenBrightness = navigator.mozPower.screenBrightness;

    var dim = function scm_dim() {
      if (!self._inTransition)
        return;

      screenBrightness -= 0.02;

      if (screenBrightness < 0.1) {
        setTimeout(function noticeTimeout() {
          if (!self._inTransition)
            return;

          finish();
        }, self._dimNotice);
        return;
      }

      navigator.mozPower.screenBrightness = screenBrightness;
      setTimeout(dim, 10);
    };

    var finish = function scm_finish() {
      self.screenEnabled = false;
      self._inTransition = false;
      self.screen.classList.add('screenoff');
      setTimeout(function realScreenOff() {
        navigator.mozPower.screenBrightness = 0;
        navigator.mozPower.screenEnabled = false;
      }, 20);

      self.fireScreenChangeEvent();
    };

    if (instant) {
      finish();
    } else {
      this._inTransition = true;
      dim();
    }

    return true;
  },

  turnScreenOn: function scm_turnScreenOn() {
    if (this.screenEnabled)
      return false;

    window.addEventListener('devicelight', this);
    window.addEventListener('mozfullscreenchange', this);

    navigator.mozPower.screenEnabled = this.screenEnabled = true;
    navigator.mozPower.screenBrightness = this._brightness;
    this.screen.classList.remove('screenoff');

    this.fireScreenChangeEvent();
    return true;
  },

  setBrightness: function scm_setBrightness(brightness) {
    this._brightness = brightness;

    /* Disregard devicelight value here and be responsive to setting changes.
    * Actual screen brightness will be updated shortly
    * with next devicelight event.
    */
    navigator.mozPower.screenBrightness = this._brightness;
  },

  setDeviceLightEnabled: function scm_setDeviceLightEnabled(enabled) {
    if (!enabled && this._deviceLightEnabled) {
      // Disabled -- set the brightness back to preferred brightness
      navigator.mozPower.screenBrightness = this._brightness;
    }
    this._deviceLightEnabled = enabled;
  },

  // The idleObserver that we will pass to IdleAPI
  idleObserver: {
    time: 60,
    onidle: null,
    onactive: null
  },

  setIdleTimeout: function scm_setIdleTimeout(time) {
    if (!('addIdleObserver' in navigator))
      return;
    navigator.removeIdleObserver(this.idleObserver);

    if (time === 0) {
      return;
    }

    this.idleObserver.time = time;
    navigator.addIdleObserver(this.idleObserver);
    this.isIdleObserverInitialized = true;
  },

  fireScreenChangeEvent: function scm_fireScreenChangeEvent() {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('screenchange',
      /* canBubble */ true, /* cancelable */ false,
      {screenEnabled: this.screenEnabled});
    window.dispatchEvent(evt);
  }
};

ScreenManager.init();

