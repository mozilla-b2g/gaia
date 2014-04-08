define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var ScreenLockDialog =
    require('panels/screen_lock_dialog/screen_lock_dialog');

  return function ctor_screenlockDialog() {
    var screenLockDialog = ScreenLockDialog();

    return SettingsPanel({
      onInit: function(panel) {
        screenLockDialog.onInit(panel);
      },
      onBeforeShow: function(panel, mode) {
        screenLockDialog.onBeforeShow(panel, mode);
      }
    });
  };
});
