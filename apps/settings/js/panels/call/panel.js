define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Call = require('panels/call/call');

  return function ctor_call_panel() {
    return SettingsPanel({
      onInit: function() {
        Call.init();
      }
    });
  };
});
