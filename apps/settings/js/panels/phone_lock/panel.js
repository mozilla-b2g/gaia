define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel');
  var PhoneLock = require('panels/phone_lock/phone_lock');

  return function ctor_phonelock() {
    var phoneLock = PhoneLock();

    return SettingsPanel({
      onInit: function(panel) {
        phoneLock.onInit(panel);
      }
    });
  };
});
