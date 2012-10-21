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
  _userBrightness: 1,

  /*
   * Wait for _dimNotice milliseconds during idle-screen-off
   */
  _dimNotice: 10 * 1000,

  /*
   * We track the value of the idle timeout pref in this variable.
   */
  _idleTimeout: 0,

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

            if (self._screenWakeLocked) {
              // Turn screen on if wake lock is acquire
              self.turnScreenOn();
            } else if (self._idled && self.screenEnabled) {
              // Turn screen off if we are already idled
              // and wake lock is released
              self.turnScreenOff(false);
            }
            break;

          case 'cpu':
            power.cpuSleepAllowed = (state != 'locked-foreground' &&
                                     state != 'locked-background');
            break;
        }
      });
    }

    // When idled, trigger the idle-screen-off process
    this.idleObserver.onidle = function scm_onidle() {
      self._idled = true;
      if (!self._screenWakeLocked)
        self.turnScreenOff(self._instantIdleOff);
    };

    // When active, cancel the idle-screen-off process & off-transition
    this.idleObserver.onactive = function scm_onactive() {
      self._idled = false;
      if (self._inTransition) {
        self._inTransition = false;
        self.setScreenBrightness(self._userBrightness, true);
      }
    };

    this._firstOn = false;
    SettingsListener.observe('screen.timeout', 60,
    function screenTimeoutChanged(value) {
      self._idleTimeout = value;
      self.setIdleTimeout(self._idleTimeout);

      if (!self._firstOn) {
        (function handleInitlogo() {
          var initlogo = document.getElementById('initlogo');
          initlogo.classList.add('hide');
          initlogo.addEventListener('transitionend', function delInitlogo() {
            initlogo.removeEventListener('transitionend', delInitlogo);
            initlogo.parentNode.removeChild(initlogo);
          });
        })();

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
      self.setIdleTimeout(0);

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
      screenOff();
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
    if (this.screenEnabled)
      return false;

    // Set the brightness before the screen is on.
    this.setScreenBrightness(this._savedBrightness, instant);

    // Actually turn the screen on.
    var power = navigator.mozPower;
    if (power)
      power.screenEnabled = true;

    this.screenEnabled = true;
    this.screen.classList.remove('screenoff');

    // Attaching the event listener effectively turn on the hardware
    // device light sensor, which _must be_ done after power.screenEnabled.
    if (this._deviceLightEnabled)
      window.addEventListener('devicelight', this);

    // The screen should be turn off with shorter timeout if
    // it was never unlocked.
    if (LockScreen.locked) {
      this.setIdleTimeout(10, true);
      var self = this;
      var stopShortIdleTimeout = function scm_stopShortIdleTimeout() {
        window.removeEventListener('unlock', stopShortIdleTimeout);
        window.removeEventListener('lockpanelchange', stopShortIdleTimeout);
        self.setIdleTimeout(self._idleTimeout, false);
      };

      window.addEventListener('unlock', stopShortIdleTimeout);
      window.addEventListener('lockpanelchange', stopShortIdleTimeout);
    } else {
      this.setIdleTimeout(this._idleTimeout, false);
    }

    this.fireScreenChangeEvent();
    return true;
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

  // The idleObserver that we will pass to IdleAPI
  idleObserver: {
    onidle: null,
    onactive: null
  },

  setIdleTimeout: function scm_setIdleTimeout(time, instant) {
    if (!('addIdleObserver' in navigator))
      return;
    navigator.removeIdleObserver(this.idleObserver);

    // Reset the idled state back to false.
    this._idled = false;

    // 0 is the value used to disable idle timer by user and by us.
    if (time === 0)
      return;

    this._instantIdleOff = instant;
    this.idleObserver.time = time;
    navigator.addIdleObserver(this.idleObserver);
  },

  fireScreenChangeEvent: function scm_fireScreenChangeEvent() {
    var evt = new CustomEvent('screenchange',
      { bubbles: true, cancelable: false,
        detail: { screenEnabled: this.screenEnabled } });
    window.dispatchEvent(evt);
  }
};

ScreenManager.init();
