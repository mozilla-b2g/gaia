define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel');
  var PhoneLockDialog = require('panels/phone_lock_dialog/phone_lock_dialog');

  return function ctor_phonelockDialog() {
    var phoneLockDialog = PhoneLockDialog();

    return SettingsPanel({
      onInit: function(panel) {
        phoneLockDialog.onInit(panel);
      },
      onBeforeShow: function(panel, mode) {
        phoneLockDialog.onBeforeShow(panel, mode);
      }
    });
  };
});
