define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var KeyboardContext = require('modules/keyboard_context');
  var keyboardTemplate = require('panels/keyboard/keyboard_template');
  var layoutTemplate = require('panels/keyboard/layout_template');
  var InstalledKeyboards = require('panels/keyboard/installed_keyboards');
  var EnabledLayouts = require('panels/keyboard/enabled_layouts');

  return function ctor_keyboardPanel() {
    var installedKeyboards =
      InstalledKeyboards(KeyboardContext, keyboardTemplate);
    var enabledLayouts = EnabledLayouts(KeyboardContext, layoutTemplate);

    return SettingsPanel({
      onInit: function kp_onInit(rootElement) {
        installedKeyboards.init({
          listViewRoot: rootElement.querySelector('.allKeyboardList')
        });
        enabledLayouts.init({
          listViewRoot: rootElement.querySelector('.enabledKeyboardList')
        });
      },
      onBeforeShow: function kp_onBeforeShow() {
        installedKeyboards.enabled = true;
        enabledLayouts.enabled = true;
      },
      onHide: function kp_onHide() {
        installedKeyboards.enabled = false;
        enabledLayouts.enabled = false;
      }
    });
  };
});
