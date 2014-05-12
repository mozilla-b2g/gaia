define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var KeyboardContext = require('modules/keyboard_context');
  var keyboardTemplate = require('panels/keyboard/keyboard_template');
  var Core = require('panels/keyboard/core');

  return function ctor_keyboardPanel() {
    var core = Core(KeyboardContext, keyboardTemplate);

    return SettingsPanel({
      onInit: function kp_onInit(rootElement) {
        core.init({
          listViewRoot: rootElement.querySelector('.allKeyboardList')
        });
      },
      onBeforeShow: function kp_onBeforeShow() {
        core.enabled = true;
      },
      onHide: function kp_onHide() {
        core.enabled = false;
      }
    });
  };
});
