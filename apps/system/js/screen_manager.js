'use strict';

/* globals SettingsListener, Service,
           ScreenBrightnessTransition, ScreenWakeLockManager,
           ScreenAutoBrightness, LazyLoader */

(function(exports) {
  var ScreenManager = {
    name: 'ScreenManager',

    /*
     * return the current screen status
     * Must not mutate directly - use toggleScreen/turnScreenOff/turnScreenOn.
     * Listen to 'screenchange' event to properly handle status changes
     * This value can be "out of sync" with real mozPower value,
     * we do this to give screen some time to flash before actual turn off.
     */
    screenEnabled: false,

    /**
     * If user is unlocking, postpone the timeout counter.
     */
    _unlocking: false,

    /*
     * before idle-screen-off, invoke a nice dimming to the brightness
     * to notify the user that the screen is about to be turn off.
     * The user can cancel the idle-screen-off by touching the screen
     * and by pressing a button (trigger onactive callback on Idle API)
     *
     */
    _inTransition: false,

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
     * This property will host a ScreenBrightnessTransition instance
     * and control the brightness transition for us.
     * Eventually we want to move all brightness controls
     * (including auto-brightness toggle and calculation) out of this module.
     */
    _screenBrightnessTransition: null,

    /*
     * ScreenAutoBrightness instance
     * manages the devicelight events and adjusts the screen brightness
     * automatically
     */
    _screenAutoBrightness: null,

    /**
     * Timeout to black the screen when locking.
     */
    LOCKING_TIMEOUT: 10,

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
     * To track the reason caused screen off?
     */
    _screenOffBy: null,
    _screenOffTimeout: 0,

    /*
     * Request wakelock during in_call state.
     * To ensure turnScreenOff by proximity event is protected by wakelock for
     * early suspend only.
     */
    _cpuWakeLock: null,

    start: function() {
      window.addEventListener('attentionopening', this);
      window.addEventListener('attentionopened', this);
      window.addEventListener('sleep', this);
      window.addEventListener('wake', this);
      window.addEventListener('nfc-tech-discovered', this);
      window.addEventListener('nfc-tech-lost', this);
      window.addEventListener('requestshutdown', this);

      // User is unlocking by sliding or other methods.
      window.addEventListener('unlocking-start', this);
      window.addEventListener('unlocking-stop', this);

      // When secure app is on, do not turn the screen off.
      // And when it's down, reset the timeout.
      window.addEventListener('secure-appopened', this);
      window.addEventListener('secure-appterminated', this);

      window.addEventListener('logohidden', this);

      // User is actively using the screen reader.
      window.addEventListener('accessibility-action', this);

      this.screen = document.getElementById('screen');

      LazyLoader.load([
        'js/screen_auto_brightness.js',
        'js/screen_brightness_transition.js',
        'shared/js/idletimer.js']).then(function() {
        this._screenBrightnessTransition = new ScreenBrightnessTransition();

        this._screenAutoBrightness = new ScreenAutoBrightness();
        this._screenAutoBrightness.onbrightnesschange = function(brightness) {
          this.setScreenBrightness(brightness, false);
        }.bind(this);
      }.bind(this))['catch'](function(err) {
        console.error(err);
      });

      var self = this;
      var power = navigator.mozPower;

      // Start the screen wake lock manager so it will monitor screen wake lock
      // for us. We will need to re-config the screen timeout
      // when the lock state is changed.
      //
      // Noted that getting a lock while the screen is off will not
      // turn on the screen, since no frame is considered visible by Gecko when
      // the screen is off. See discussion in bug 818840.
      this._wakeLockManager = new ScreenWakeLockManager();
      this._wakeLockManager.start();

      this._firstOn = false;


      SettingsListener.observe('screen.timeout', 60,
        function screenTimeoutChanged(value) {
          if (typeof value !== 'number') {
            value = parseInt(value);
          }
          self._idleTimeout = value;

          if (!self._firstOn) {
            self._firstOn = true;

            // During boot up, the brightness was set by bootloader as 0.5,
            // Let's set the API value to that so setScreenBrightness() can
            // dim nicely to value set by user.
            power.screenBrightness = 0.5;

            // Turn screen on with dim.
            self.turnScreenOn(false);

            Service.request('schedule', () => {
              this._wakeLockManager.onwakelockchange =
                this._reconfigScreenTimeout.bind(this);
              });
          }
          Service.request('schedule', () => {
            this._setIdleTimeout(this._idleTimeout);
          });
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
      Service.registerState('screenEnabled', this);
      Service.register('turnScreenOn', this);
      Service.register('turnScreenOff', this);
    },

    handleEvent: function scm_handleEvent(evt) {
      var telephony = window.navigator.mozTelephony;
      var call;

      switch (evt.type) {
        case 'attentionopening':
        case 'attentionopened':
          if (!this.enabled) {
            this.turnScreenOn();
          }
          break;
        case 'devicelight':
          if (!this._deviceLightEnabled || !this.screenEnabled ||
              this._inTransition) {
            return;
          }
          this._screenAutoBrightness &&
          this._screenAutoBrightness.autoAdjust(evt.value);
          break;

        case 'sleep':
          this.turnScreenOff(true, 'powerkey');
          break;

        case 'wake':
          this.turnScreenOn();
          break;

        case 'accessibility-action':
          this._reconfigScreenTimeout();
          break;

        case 'nfc-tech-discovered':
        case 'nfc-tech-lost':
          if (this._inTransition) {
            this.turnScreenOn();
          } else {
            this._reconfigScreenTimeout();
          }
          break;

        case 'unlocking-start':
          this._setUnlocking();
          break;

        // When secure app is on, do not turn the screen off.
        // And when it's down, reset the timeout.
        case 'secure-appopened':
        case 'secure-appterminated':
          this._reconfigScreenTimeout();
          break;
        case 'unlocking-stop':
          this._resetUnlocking();
          break;

        case 'userproximity':
          if (Service.query('Bluetooth.isSCOProfileConnected') ||
              telephony.speakerEnabled ||
              Service.query('isHeadsetConnected')) {
              // XXX: Remove this hack in Bug 868348
              // We shouldn't access headset status from statusbar.
            if (this._screenOffBy == 'proximity') {
              this.turnScreenOn();
            }
            break;
          }

          if (evt.near) {
            this.turnScreenOff(true, 'proximity');
          } else {
            this.turnScreenOn();
          }
          break;

        case 'callschanged':
          if (!telephony.calls.length &&
              !(telephony.conferenceGroup &&
                telephony.conferenceGroup.calls.length)) {

            this.turnScreenOn();

            window.removeEventListener('userproximity', this);

            if (this._cpuWakeLock) {
             this._cpuWakeLock.unlock();
             this._cpuWakeLock = null;
            }
            break;
          }

          // If the _cpuWakeLock is already set we are in a multiple
          // call setup, the user will be notified by a tone.
          if (this._cpuWakeLock) {
            break;
          }

          // Enable the user proximity sensor once the call is connected.
          call = telephony.calls[0];
          call.addEventListener('statechange', this);

          break;

        case 'statechange':
          call = evt.target;
          if (['connected', 'alerting', 'dialing'].indexOf(call.state) === -1) {
            break;
          }

          // The call is connected (MT call) or alerting/dialing (MO call).
          // Remove the statechange listener and enable the user proximity
          // sensor.
          call.removeEventListener('statechange', this);

          this._cpuWakeLock = navigator.requestWakeLock('cpu');
          window.addEventListener('userproximity', this);
          break;

        // Reconfig screen time out after booting.
        case 'logohidden':
          window.removeEventListener('logohidden', this);
          this._reconfigScreenTimeout();
          break;

        case 'lockscreen-appclosing' :
        case 'lockpanelchange' :
          window.removeEventListener('lockscreen-appclosing', this);
          window.removeEventListener('lockpanelchange', this);
          this._setIdleTimeout(this._idleTimeout, false);
          break;

        case 'requestshutdown':
          this.turnScreenOn();
          if (evt.detail && evt.detail.startPowerOff) {
            evt.detail.startPowerOff(false);
          }
          break;
      }
    },

    toggleScreen: function scm_toggleScreen() {
      if (this.screenEnabled) {
        // Currently there is no one used toggleScreen, so just set reason as
        // toggle. If it is used by someone in the future, we can rename it.
        this.turnScreenOff(true, 'toggle');
      } else {
        this.turnScreenOn();
      }
    },

    turnScreenOff: function scm_turnScreenOff(instant, reason) {
      if (!this.screenEnabled) {
        return false;
      }

      var self = this;
      if (reason) {
        this._screenOffBy = reason;
      }

      // Remember the current screen brightness. We will restore it when
      // we turn the screen back on.
      self._savedBrightness = navigator.mozPower.screenBrightness;

      // Remove the cpuWakeLock and listening of proximity event, if screen is
      // turned off by power key.
      if (this._cpuWakeLock != null && this._screenOffBy == 'powerkey') {
        window.removeEventListener('userproximity', this);
        this._cpuWakeLock.unlock();
        this._cpuWakeLock = null;
      }

      var screenOff = function scm_screenOff() {
        self._setIdleTimeout(0);

        if (self._deviceLightEnabled) {
          window.removeEventListener('devicelight', self);
        }

        window.removeEventListener('lockscreen-appclosing', self);
        window.removeEventListener('lockpanelchange', self);
        self.screenEnabled = false;
        self._inTransition = false;
        self.screen.classList.add('screenoff');
        clearTimeout(self._screenOffTimeout);
        self._screenOffTimeout = setTimeout(function realScreenOff() {
          self.setScreenBrightness(0, true);
          // Sometimes the ScreenManager.screenEnabled and
          // mozPower.screenEnabled values are out of sync.
          // Since the rest of the world relies only on
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
        if (!self._inTransition) {
          return;
        }

        screenOff();
      }, self._dimNotice);

      return true;
    },

    turnScreenOn: function scm_turnScreenOn(instant) {
      clearTimeout(this._screenOffTimeout);
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

      // If we are in a call  or a conference call and there
      // is no cpuWakeLock, we would get one here.
      var telephony = window.navigator.mozTelephony;
      var ongoingConference = telephony && telephony.conferenceGroup &&
          telephony.conferenceGroup.calls.length;
      if (!this._cpuWakeLock && telephony &&
          (telephony.calls.length || ongoingConference)) {

        var connected = telephony.calls.some(function(call) {
          if (call.state == 'connected') {
            return true;
          }
          return false;
        });

        if (connected || ongoingConference) {
          this._cpuWakeLock = navigator.requestWakeLock('cpu');
          window.addEventListener('userproximity', this);
        }
      }

      // Actually turn the screen on.
      var power = navigator.mozPower;
      if (power) {
        power.screenEnabled = true;
      }
      this.screenEnabled = true;
      this.screen.classList.remove('screenoff');

      // Attaching the event listener effectively turn on the hardware
      // device light sensor, which _must be_ done after power.screenEnabled.
      if (this._deviceLightEnabled) {
        window.addEventListener('devicelight', this);
      }

      this._reconfigScreenTimeout();
      this.fireScreenChangeEvent();

      return true;
    },

    _reconfigScreenTimeout: function scm_reconfigScreenTimeout() {
      // Remove idle timer if screen wake lock is acquired or
      // if no app has been displayed yet.
      if (this._wakeLockManager.isHeld ||
          (!Service.query('AppWindowManager.getActiveWindow') &&
           !Service.query('locked'))) {
        this._setIdleTimeout(0);
      // The screen should be turn off with shorter timeout if
      // it was never unlocked.
      } else if (!this._unlocking) {
        if (Service.query('getTopMostWindow') &&
            Service.query('getTopMostWindow').CLASS_NAME ===
            'LockScreenWindow') {
          this._setIdleTimeout(this.LOCKING_TIMEOUT, true);
          window.addEventListener('lockscreen-appclosing', this);
          window.addEventListener('lockpanelchange', this);
        } else {
          this._setIdleTimeout(this._idleTimeout, false);
        }
      }
    },

    /**
     * If user is unlocking, postpone the timeout counter.
     *
     * @this {ScreenManager}
     */
    _setUnlocking: function scm_setUnlocking() {
        this._unlocking = true;

        // Need to cancel it: the last set timeout would still be triggered.
        window.clearIdleTimeout(this._idleTimerId);
     },

    /**
     * Reset the state of user unlocking.
     *
     * @this {ScreenManager}
     */
    _resetUnlocking: function scm_resetUnlocking() {
        this._unlocking = false;
        this._reconfigScreenTimeout();
     },

    setScreenBrightness: function scm_setScreenBrightness(brightness, instant) {
      this._targetBrightness = brightness;
      var power = navigator.mozPower;
      if (!power) {
        return;
      }

      // Stop the current transition
      if (this._screenBrightnessTransition &&
          this._screenBrightnessTransition.isRunning) {
        this._screenBrightnessTransition.abort();
      }

      if (typeof instant !== 'boolean') {
        instant = true;
      }

      if (instant) {
        power.screenBrightness = brightness;
        return;
      }

      this._screenBrightnessTransition &&
      this._screenBrightnessTransition.transitionTo(this._targetBrightness);
    },

    setDeviceLightEnabled: function scm_setDeviceLightEnabled(enabled) {
      if (!enabled && this._deviceLightEnabled) {
        // Disabled -- set the brightness back to preferred brightness
        this.setScreenBrightness(this._userBrightness, false);
      }
      this._deviceLightEnabled = enabled;

      this._screenAutoBrightness &&
      this._screenAutoBrightness.reset();

      if (!this.screenEnabled) {
        return;
      }

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
      if (time === 0) {
        return;
      }

      var self = this;
      var idleCallback = function idle_proxy() {
        self.turnScreenOff(instant, 'idle_timeout');
      };
      var activeCallback = function active_proxy() {
        self.turnScreenOn(true);
      };

      var finalTimeout =
        instant ? time * 1000 : (time * 1000) - this._dimNotice;
      this._idleTimerId = window.setIdleTimeout(idleCallback,
                                                activeCallback, finalTimeout);
    },

    fireScreenChangeEvent: function scm_fireScreenChangeEvent() {
      var detail = { screenEnabled: this.screenEnabled };

      // Tell others the cause of screen-off.
      detail.screenOffBy = this._screenOffBy;

      var evt = new CustomEvent('screenchange',
        { bubbles: true, cancelable: false,
          detail: detail });
      window.dispatchEvent(evt);
    }
  };
  exports.ScreenManager = ScreenManager;
}(window));

