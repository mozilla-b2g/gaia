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

  preferredBrightness: 0.5,

  toggleScreen: function scm_toggleScreen() {
    if (this.screenEnabled)
      this.turnScreenOff();
    else
      this.turnScreenOn();
  },

  turnScreenOff: function scm_turnScreenOff() {
    if (!this.screenEnabled)
      return false;

    this.preferredBrightness = navigator.mozPower.screenBrightness;
    navigator.mozPower.screenBrightness = 0.0;

    this.screenEnabled = false;
    setTimeout(function realScreenOff() {
      navigator.mozPower.screenEnabled = false;
    }, 20);

    this.sendEvent();
    return true;
  },

  turnScreenOn: function scm_turnScreenOn() {
    if (this.screenEnabled)
      return false;

    navigator.mozPower.screenEnabled = this.screenEnabled = true;
    navigator.mozPower.screenBrightness = this.preferredBrightness;

    this.sendEvent();
    return true;
  },

  sendEvent: function scm_sendEvent() {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('screenchange',
      /* canBubble */ true, /* cancelable */ false,
      {screenEnabled: this.screenEnabled});
    window.dispatchEvent(evt);
  }
};
