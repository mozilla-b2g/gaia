define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var ScreenLock = require('panels/screen_lock/screen_lock');

  return function ctor_screenlock() {
    var screenLock = ScreenLock();

    return SettingsPanel({
      onInit: function(panel) {
        screenLock.onInit(panel);
      }
    });
  };
});
