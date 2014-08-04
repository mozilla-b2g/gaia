define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var KeyboardContext = require('modules/keyboard_context');
  var KeyboardHelper = require('shared/keyboard_helper');
  var NestedTemplateFactory =
    require('panels/keyboard_add_layouts/nested_template_factory');
  var keyboardTemplate =
    require('panels/keyboard_add_layouts/keyboard_template');
  var layoutTemplate = require('panels/keyboard_add_layouts/layout_template');
  var Core = require('panels/keyboard_add_layouts/core');

  return function ctor_addLayoutsPanel() {
    var nestedTemplate =
      NestedTemplateFactory(keyboardTemplate, layoutTemplate);
    var core = Core(KeyboardContext, nestedTemplate);

    return SettingsPanel({
      onInit: function kalp_onInit(rootElement) {
        core.init({
          listViewRoot: rootElement.querySelector('.keyboardAppContainer')
        });
      },
      onBeforeShow: function kalp_onBeforeShow() {
        core.enabled = true;
      },
      onBeforeHide: function kalp_onBeforeHide() {
        // save changes to settings
        KeyboardHelper.saveToSettings();
      },
      onHide: function kalp_onHide() {
        core.enabled = false;
      }
    });
  };
});
