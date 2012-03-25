'use strict';

// TODO
// Gaia.AppManager.foregroundWindow is currently used by the keyboard
// There isn't any reason for any other code to use it, and we should
// get rid of it when we can.
// See bug 736628: https://bugzilla.mozilla.org/show_bug.cgi?id=736628
if (!window['Gaia'])
  var Gaia = {};

Gaia.AppManager = {
  get foregroundWindow() {
    return WindowManager.getAppFrame(WindowManager.getDisplayedApp());
  }
};
