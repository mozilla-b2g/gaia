/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ScreenManager = {
  /*
  * return the current screen status
  * Must not multate directly - use toggleScreen/turnScreenOff/turnScreenOn.
  * Listen to 'screenchange' event to properly handle status changes
  * This value can be "out of sync" with real mozPower value,
  * we do this to give screen some time to flash before actual turn off.
  */
  screenEnabled: true,

  _inTransition: false,

  _deviceLightEnabled: true,

  _brightness: 0.5,

  init: function scm_init() {
    /* Allow others to cancel the keyup event but not the keydown event */
    window.addEventListener('keydown', this, true);
    window.addEventListener('keyup', this);

    /* Respect the information from DeviceLight sensor */
    window.addEventListener('devicelight', this);

    this.screen = document.getElementById('screen');
    this.screen.classList.remove('screenoff');

    var self = this;

    this.idleObserver.onidle = function scm_onidle() {
      self.turnScreenOff(false);
    };

    this.idleObserver.onactive = function scm_onactive() {
      if (self._inTransition)
        self.turnScreenOn();
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

    SettingsListener.observe('screen.brightness', 0.5,
    function brightnessSettingChanged(value) {
      if (typeof value === 'string')
        value = parseFloat(value);

      self.setBrightness(value);
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
          Math.max(Math.min((evt.value / 1100), this._brightness), 0.2);
        navigator.mozPower.screenBrightness = brightness;

        break;

        // The screenshot module also listens for the SLEEP key and
        // may call preventDefault() on the keyup and keydown events.
      case 'keydown':
        if (evt.keyCode !== evt.DOM_VK_SLEEP && evt.keyCode !== evt.DOM_VK_HOME)
          return;

        if (!evt.defaultPrevented)
          this._turnOffScreenOnKeyup = true;
        if (!this.screenEnabled || this._inTransition) {
          this.turnScreenOn();
          this._turnOffScreenOnKeyup = false;
        }

        break;
      case 'keyup':
        if (this.screenEnabled && this._turnOffScreenOnKeyup &&
            evt.keyCode == evt.DOM_VK_SLEEP && !evt.defaultPrevented)
          this.turnScreenOff(true);

        break;
    }
  },

  toggleScreen: function scm_toggleScreen() {
    if (this.screenEnabled)
      this.turnScreenOff();
    else
      this.turnScreenOn();
  },

  turnScreenOff: function scm_turnScreenOff(instant) {
    if (!this.screenEnabled || this._inTransition)
      return false;

    var self = this;
    var screenBrightness = navigator.mozPower.screenBrightness;

    var dim = function scm_dim() {
      if (!self._inTransition)
        return;

      screenBrightness -= 0.02;

      if (screenBrightness <= 0) {
        finish();
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
        navigator.mozPower.screenEnabled = false;
      }, 20);

      this.fireScreenChangeEvent();
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
    if (this._inTransition) {
      // The user had cancel the turnScreenOff action.
      this._inTransition = false;
      navigator.mozPower.screenBrightness = this._brightness;
      return;
    }
    if (this.screenEnabled)
      return false;

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
    onactive: null,
  },

  setIdleTimeout: function scm_setIdleTimeout(time) {
    if (!navigator.addIdleObserver)
      return;

    // Remove the original observer.
    navigator.removeIdleObserver(this.idleObserver);

    // If time = 0, then there is no idle timeout to set.
    if (!time)
      return;

    var self = this;
    this.idleObserver.time = time;

    navigator.addIdleObserver(this.idleObserver);
  },

  fireScreenChangeEvent: function scm_fireScreenChangeEvent() {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('screenchange',
      /* canBubble */ true, /* cancelable */ false,
      {screenEnabled: this.screenEnabled});
    window.dispatchEvent(evt);
  }
};
