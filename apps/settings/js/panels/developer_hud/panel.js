/**
 * Used to show Device/developer hud panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DeveloperHud = require('panels/developer_hud/developer_hud');

  return function ctor_developer_hud_panel() {
    var developerHud = DeveloperHud();

    return SettingsPanel({
      onInit: function(panel) {
        var elements = {
          widgets: panel.querySelectorAll('.hud-widgets'),
          items: panel.querySelectorAll('.memory-item')
        };
        developerHud.init(elements);
      }
    });
  };
});
