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
   * The auto-brightness algorithm will never set the screen brightness
   * to a value smaller than this. 0.1 seems like a good screen brightness
   * in a completely dark room on a Unagi.
   */
  AUTO_BRIGHTNESS_MINIMUM: 0.1,

  /*
   * This constant is used in the auto brightness algorithm. We take
   * the base 10 logarithm of the incoming lux value from the light
   * sensor and multiplied it by this constant. That value is used to
   * compute a weighted average with the current brightness and
   * finally that average brightess is and then clamped to the range
   * [AUTO_BRIGHTNESS_MINIMUM, 1.0].
   *
   * Making this value larger will increase the brightness for a given
   * ambient light level. At a value of about .25, the screen will be
   * at full brightness in sunlight or in a well-lighted work area.
   * At a value of about .3, the screen will typically be at maximum
   * brightness in outdoor daylight conditions, even when overcast.
   */
  AUTO_BRIGHTNESS_CONSTANT: .27,

  /*
   * When we change brightness we animate it smoothly.
   * This constant is the number of milliseconds between adjustments
   */
  BRIGHTNESS_ADJUST_INTERVAL: 20,

  /*
   * When brightening or dimming the screen, this is how much we adjust
   * the brightness value at a time.
   */
  BRIGHTNESS_ADJUST_STEP: 0.04,

  /*
   * Wait for _dimNotice milliseconds during idle-screen-off
   */
  _dimNotice: 10 * 1000,

  /*
   * We track the value of the idle timeout pref in this variable.
   */
  _idleTimeout: 0,
  _idleTimerId: 0,

  /*
   * If the screen off is triggered by promixity during phon call then
   * we need wake it up while phone is ended.
   */
  _screenOffByProximity: false,

  /*
   * Request wakelock during in_call state.
   * To ensure turnScreenOff by proximity event is protected by wakelock for
   * early suspend only.
   */
  _cpuWakeLock: null,

  /*
   * Current state of the CPU Wake lock
   */
  _cpuState: null,

  /*
   * We track the audio status
   */
  _audioActive: false,
  _audioCpuSleepTimerId: 0,

  init: function scm_init() {
    window.addEventListener('sleep', this);
    window.addEventListener('wake', this);
    window.addEventListener('mozChromeEvent', this);

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
            self._cpuState = state;
            self.refreshCpuSleepAllowed();
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

    var telephony = window.navigator.mozTelephony;
    if (telephony) {
      telephony.addEventListener('callschanged', this);
    }
  },

  //
  // Automatically adjust the screen brightness based on the ambient
  // light (in lux) measured by the device light sensor
  //
  autoAdjustBrightness: function scm_adjustBrightness(lux) {
    var currentBrightness = this._targetBrightness;

    if (lux < 1)  // Can't take the log of 0 or negative numbers
      lux = 1;

    var computedBrightness =
      Math.log(lux) / Math.LN10 * this.AUTO_BRIGHTNESS_CONSTANT;

    var clampedBrightness = Math.max(this.AUTO_BRIGHTNESS_MINIMUM,
                                     Math.min(1.0, computedBrightness));

    // If nothing changed, we're done.
    if (clampedBrightness === currentBrightness)
      return;

    this.setScreenBrightness(clampedBrightness, false);
  },

  handleEvent: function scm_handleEvent(evt) {
    switch (evt.type) {
      case 'devicelight':
        if (!this._deviceLightEnabled || !this.screenEnabled ||
            this._inTransition)
          return;
        this.autoAdjustBrightness(evt.value);
        break;

      case 'sleep':
        this.turnScreenOff(true);
        break;

      case 'wake':
        this.turnScreenOn();
        break;

      case 'userproximity':
        this._screenOffByProximity = evt.near;
        if (evt.near) {
          this.turnScreenOff(true);
        } else {
          this.turnScreenOn();
        }
        break;

      case 'callschanged':
        var telephony = window.navigator.mozTelephony;
        if (!telephony.calls.length) {
          if (this._screenOffByProximity) {
            this.turnScreenOn();
          }

          window.removeEventListener('userproximity', this);
          this._screenOffByProximity = false;

          if (this._cpuWakeLock) {
           this._cpuWakeLock.unlock();
           this._cpuWakeLock = null;
          }
          break;
        }

        // If the _cpuWakeLock is already set we are in a multiple
        // call setup, turning the screen on to let user see the
        // notification.
        if (this._cpuWakeLock) {
          this.turnScreenOn();

          break;
        }

        // Enable the user proximity sensor once the call is connected.
        var call = telephony.calls[0];
        call.addEventListener('statechange', this);

        break;

      case 'statechange':
        var call = evt.target;
        if (call.state !== 'connected') {
          break;
        }

        // The call is connected. Remove the statechange listener
        // and enable the user proximity sensor.
        call.removeEventListener('statechange', this);

        this._cpuWakeLock = navigator.requestWakeLock('cpu');
        window.addEventListener('userproximity', this);
        break;

      case 'mozChromeEvent':
        if (evt.detail.type == 'audio-channel-changed') {
          var audioActive = (evt.detail.channel !== 'none');

          if (this._audioCpuSleepTimerId) {
            clearTimeout(this._audioCpuSleepTimerId);
            this._audioCpuSleepTimerId = 0;
          }

          // If some audio channel is active we refresh the cpuSleepAllowed
          // immediately, otherwise we just use a timer in order to prevert
          // rapid stop/start.
          if (audioActive) {
            this._audioActive = true;
            this.refreshCpuSleepAllowed();
          } else {
            var self = this;
            this._audioCpuSleepTimerId = setTimeout(function cpuSleepTimer() {
              self._audioActive = false;
              self.refreshCpuSleepAllowed();
              self._audioCpuSleepTimerId = 0;
            }, 2000);
          }
        }
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

    // Remove the cpuWakeLock if screen is not turned off by
    // userproximity event.
    if (!this._screenOffByProximity && this._cpuWakeLock) {
      window.removeEventListener('userproximity', this);
      this._cpuWakeLock.unlock();
      this._cpuWakeLock = null;
    }

    var screenOff = function scm_screenOff() {
      self._setIdleTimeout(0);

      window.removeEventListener('devicelight', self);

      self.screenEnabled = false;
      self._inTransition = false;
      self.screen.classList.add('screenoff');
      setTimeout(function realScreenOff() {
        self.setScreenBrightness(0, true);
        // Sometimes the ScreenManager.screenEnabled and mozPower.screenEnabled
        // values are out of sync. Since the rest of the world relies only on
        // the value of ScreenManager.screenEnabled it can be some situations
        // where the screen is off but ScreenManager think it is on... (see
        // bug 822463). Ideally a callback should have been used, like
        // ScreenManager.getScreenState(function(value) { ...} ); but there
        // are too many places to change that for now.
        self.screenEnabled = false;
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
    if (this.screenEnabled) {
      if (this._inTransition) {
        // Cancel the dim out
        this._inTransition = false;
        this.setScreenBrightness(this._savedBrightness, true);
        this._reconfigScreenTimeout();
      }
      return false;
    }

    // Set the brightness before the screen is on.
    this.setScreenBrightness(this._savedBrightness, instant);

    // If we are in a call and there is no cpuWakeLock,
    // we would have to get one here.
    var telephony = window.navigator.mozTelephony;
    if (!this._cpuWakeLock && telephony && telephony.calls.length) {
      telephony.calls.some(function checkCallConnection(call) {
        if (call.state == 'connected') {
          this._cpuWakeLock = navigator.requestWakeLock('cpu');
          window.addEventListener('userproximity', this);
          return true;
        }
        return false;
      }, this);
    }

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

    // Make sure we don't have another brightness change scheduled
    if (this._transitionBrightnessTimer) {
      clearTimeout(this._transitionBrightnessTimer);
      this._transitionBrightnessTimer = null;
    }

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
    var delta = this.BRIGHTNESS_ADJUST_STEP;

    // Is this the last time adjustment we need to make?
    if (Math.abs(this._targetBrightness - screenBrightness) <= delta) {
      power.screenBrightness = this._targetBrightness;
      this._transitionBrightnessTimer = null;
      return;
    }

    if (screenBrightness > this._targetBrightness)
      delta *= -1;

    screenBrightness += delta;
    power.screenBrightness = screenBrightness;

    this._transitionBrightnessTimer =
      setTimeout(function transitionBrightnessTimeout() {
        self.transitionBrightness();
      }, this.BRIGHTNESS_ADJUST_INTERVAL);
  },

  setDeviceLightEnabled: function scm_setDeviceLightEnabled(enabled) {
    if (!enabled && this._deviceLightEnabled) {
      // Disabled -- set the brightness back to preferred brightness
      this.setScreenBrightness(this._userBrightness, false);
    }
    this._deviceLightEnabled = enabled;

    if (!this.screenEnabled)
      return;

    // Disable/enable device light sensor accordingly.
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
  },

  refreshCpuSleepAllowed: function scm_refreshCpuSleepAllowed() {
    var power = navigator.mozPower;
    power.cpuSleepAllowed = (this._cpuState != 'locked-foreground' &&
                             this._cpuState != 'locked-background' &&
                             !this._audioActive);
  }
};

ScreenManager.init();
