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
  _userBrightness: 1,
  _savedBrightness: 1,

  /*
   * Wait for _dimNotice milliseconds during idle-screen-off
   */
  _dimNotice: 10 * 1000,

  /*
   * We track the value of the idle timeout pref in this variable.
   */
  _idleTimeout: 0,
  _idleTimerId: 0,

  init: function scm_init() {
    window.addEventListener('sleep', this);
    window.addEventListener('wake', this);

    this.screen = document.getElementById('screen');

    var self = this;
    var power = navigator.mozPower;

    if (power) {
      power.addWakeLockListener(function scm_handleWakeLock(topic, state) {
        switch (topic) {
          case 'screen':
            self._screenWakeLocked = (state == 'locked-foreground');

            if (self._screenWakeLocked)
              // Turn screen on if wake lock is acquire
              self.turnScreenOn();
            self._reconfigScreenTimeout();
            break;

          case 'cpu':
            power.cpuSleepAllowed = (state != 'locked-foreground' &&
                                     state != 'locked-background');
            break;
        }
      });
    }

    this._firstOn = false;
    SettingsListener.observe('screen.timeout', 60,
    function screenTimeoutChanged(value) {
      if (typeof value !== 'number')
        value = parseInt(value);
      self._idleTimeout = value;
      self._setIdleTimeout(self._idleTimeout);

      if (!self._firstOn) {
        self._firstOn = true;

        // During boot up, the brightness was set by bootloader as 0.5,
        // Let's set the API value to that so setScreenBrightness() can
        // dim nicely to value set by user.
        power.screenBrightness = 0.5;

        // Turn screen on with dim.
        self.turnScreenOn(false);
      }
    });

    SettingsListener.observe('screen.automatic-brightness', true,
    function deviceLightSettingChanged(value) {
      self.setDeviceLightEnabled(value);
    });

    SettingsListener.observe('screen.brightness', 1,
    function brightnessSettingChanged(value) {
      self._userBrightness = value;
      self.setScreenBrightness(value, false);
    });
  },

  handleEvent: function scm_handleEvent(evt) {
    switch (evt.type) {
      case 'devicelight':
        if (!this._deviceLightEnabled || !this.screenEnabled ||
            this._inTransition)
          return;

        // This is a rather naive but pretty effective heuristic
        var brightness =
          Math.max(Math.min((evt.value / 1100), this._userBrightness), 0.1);
        if (Math.abs(this._targetBrightness - brightness) > 0.3)
          this.setScreenBrightness(brightness, false);
        break;

      case 'sleep':
        this.turnScreenOff(true);
        break;

      case 'wake':
        this.turnScreenOn();
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
    
    var self = this;

    // Remember the current screen brightness. We will restore it when
    // we turn the screen back on.
    self._savedBrightness = navigator.mozPower.screenBrightness;

    var screenOff = function scm_screenOff() {
      self._setIdleTimeout(0);

      window.removeEventListener('devicelight', self);

      self.screenEnabled = false;
      self._inTransition = false;
      self.screen.classList.add('screenoff');
      setTimeout(function realScreenOff() {
        self.setScreenBrightness(0, true);
        navigator.mozPower.screenEnabled = false;
      }, 20);

      self.fireScreenChangeEvent();
    };

    if (instant) {
      if (!WindowManager.isFtuRunning()) {
        screenOff();
      }
      return true;
    }

    this.setScreenBrightness(0.1, false);
    this._inTransition = true;
    setTimeout(function noticeTimeout() {
      if (!self._inTransition)
        return;

      screenOff();
    }, self._dimNotice);

    return true;
  },

  turnScreenOn: function scm_turnScreenOn(instant) {
    if (this.screenEnabled) {
      if (this._inTransition) {
        // Cancel the dim out
        this._inTransition = false;
        this.setScreenBrightness(this._userBrightness, true);
        this._reconfigScreenTimeout();
      }
      return false;
    }

    // Set the brightness before the screen is on.
    this.setScreenBrightness(this._savedBrightness, instant);

    // Actually turn the screen on.
    var power = navigator.mozPower;
    if (power)
      power.screenEnabled = true;

    this._lastScreenOnTimestamp = Date.now();
    this.screenEnabled = true;
    this.screen.classList.remove('screenoff');

    // Attaching the event listener effectively turn on the hardware
    // device light sensor, which _must be_ done after power.screenEnabled.
    if (this._deviceLightEnabled)
      window.addEventListener('devicelight', this);

    this._reconfigScreenTimeout();
    this.fireScreenChangeEvent();
    return true;
  },

  _reconfigScreenTimeout: function scm_reconfigScreenTimeout() {
    // Remove idle timer if screen wake lock is acquired.
    if (this._screenWakeLocked) {
      this._setIdleTimeout(0);
    // The screen should be turn off with shorter timeout if
    // it was never unlocked.
    } else if (LockScreen.locked) {
      this._setIdleTimeout(10, true);
      var self = this;
      var stopShortIdleTimeout = function scm_stopShortIdleTimeout() {
        window.removeEventListener('unlock', stopShortIdleTimeout);
        window.removeEventListener('lockpanelchange', stopShortIdleTimeout);
        self._setIdleTimeout(self._idleTimeout, false);
      };

      window.addEventListener('unlock', stopShortIdleTimeout);
      window.addEventListener('lockpanelchange', stopShortIdleTimeout);
    } else {
      this._setIdleTimeout(this._idleTimeout, false);
    }
  },

  setScreenBrightness: function scm_setScreenBrightness(brightness, instant) {
    this._targetBrightness = brightness;
    var power = navigator.mozPower;
    if (!power)
      return;

    if (typeof instant !== 'boolean')
      instant = true;

    if (instant) {
      power.screenBrightness = brightness;
      return;
    }

    // transitionBrightness() is a looping function that will
    // gracefully tune the brightness to _targetBrightness for us.
    this.transitionBrightness();
  },

  transitionBrightness: function scm_transitionBrightness() {
    var self = this;
    var power = navigator.mozPower;
    var screenBrightness = power.screenBrightness;

    // We can never set the brightness to the exact number of
    // target brightness, so if the difference is close enough,
    // we stop the loop and set it for the last time.
    if (Math.abs(this._targetBrightness - screenBrightness) < 0.05) {
      power.screenBrightness = this._targetBrightness;
      return;
    }

    var dalta = 0.02;
    if (screenBrightness > this._targetBrightness)
      dalta *= -1;

    screenBrightness += dalta;
    power.screenBrightness = screenBrightness;

    clearTimeout(this._transitionBrightnessTimer);
    this._transitionBrightnessTimer =
      setTimeout(function transitionBrightnessTimeout() {
        self.transitionBrightness();
      }, 10);
  },

  setDeviceLightEnabled: function scm_setDeviceLightEnabled(enabled) {
    if (!enabled && this._deviceLightEnabled) {
      // Disabled -- set the brightness back to preferred brightness
      this.setScreenBrightness(this._userBrightness, false);
    }
    this._deviceLightEnabled = enabled;

    if (!this.screenEnabled)
      return;

    // Disable/enable device light censor accordingly.
    // This will also toggle the actual hardware, which
    // must be done while the screen is on.
    if (enabled) {
      window.addEventListener('devicelight', this);
    } else {
      window.removeEventListener('devicelight', this);
    }
  },

  _setIdleTimeout: function scm_setIdleTimeout(time, instant) {
    window.clearIdleTimeout(this._idleTimerId);

    // Reset the idled state back to false.
    this._idled = false;

    // 0 is the value used to disable idle timer by user and by us.
    if (time === 0)
      return;

    var self = this;
    var idleCallback = function idle_proxy() {
      self.turnScreenOff(instant);
    };
    var activeCallback = function active_proxy() {
      self.turnScreenOn(true);
    };

    this._idleTimerId = window.setIdleTimeout(idleCallback,
                                              activeCallback, time * 1000);
  },

  fireScreenChangeEvent: function scm_fireScreenChangeEvent() {
    var evt = new CustomEvent('screenchange',
      { bubbles: true, cancelable: false,
        detail: { screenEnabled: this.screenEnabled } });
    window.dispatchEvent(evt);
  }
};

ScreenManager.init();
