/**
 * Used to show Personalization/Homescreens panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Homescreens = require('panels/homescreens/homescreens');

  return function ctor_homescreen_panel() {
    var homescreens = Homescreens();

    return SettingsPanel({
      onInit: function(panel) {
        var element = panel.querySelector('div > ul');
        homescreens.init(element);
      }
    });
  };
});
