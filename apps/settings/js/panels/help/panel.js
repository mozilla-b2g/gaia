/**
 * Used to show Device/Help panel
 */
define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel'),
      Support = require('panels/help/support');

  return function ctor_support_panel() {
    var help = Support();
    return SettingsPanel({
      onInit: function(panel) {
        var elements = {
          userGuide: panel.querySelector('#user-guide'),
          help: panel.querySelector('#help'),
          supportText: panel.querySelector('#help-online-support-text'),
          supportNumber: panel.querySelector('#help-call-support-numbers')
        };
        help.init(elements);
      }
    });
  };
});
