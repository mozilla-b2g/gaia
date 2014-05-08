/**
 * In the panels we initialize a ListView with the data provided by
 * KeyboardContext. Templates for generating UI elements are also defined
 * here.
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var KeyboardContext = require('modules/keyboard_context');
  var layoutTemplate =
    require('panels/keyboard_enabled_layouts/layout_template');
  var Core = require('panels/keyboard_enabled_layouts/core');

  return function ctor_enabledLayoutsPanel() {
    var core = Core(KeyboardContext, layoutTemplate);
    return SettingsPanel({
      onInit: function kelp_onInit(rootElement) {
        core.init({
          listViewRoot: rootElement.querySelector('.enabledKeyboardList')
        });
      },
      onBeforeShow: function kelp_onBeforeShow() {
        core.enabled = true;
      },
      onHide: function kelp_onHide() {
        core.enabled = false;
      }
    });
  };
});
