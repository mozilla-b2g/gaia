define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var ScreenLockPasscode =
    require('panels/screen_lock_passcode/screen_lock_passcode');

  return function ctor_screenlockPasscode() {
    var screenLockPasscode = ScreenLockPasscode();

    return SettingsPanel({
      onInit: function(panel) {
        screenLockPasscode.onInit(panel);
      },
      onBeforeShow: function(panel, mode) {
        screenLockPasscode.onBeforeShow(panel, mode);
      },
      onShow: function() {
        screenLockPasscode.onShow();
      }
    });
  };
});
