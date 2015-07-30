/**
 * Used to show Device/developer panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Developer = require('panels/developer/developer');

  return function ctor_developer_panel() {
    var developer = Developer();

    return SettingsPanel({
      onInit: function(panel) {
        var elements = {
          resetSwitch: panel.querySelector('.reset-devtools'),
          ftuLauncher: panel.querySelector('.ftuLauncher'),
          softwareHomeButton: panel.querySelector('.software-home-button'),
          homegesture: panel.querySelector('.homegesture')
        };
        developer.init(elements);
      }
    });
  };
});
