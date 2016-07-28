/**
 * The display panel allow user to modify timeout forscreen-off, brightness.
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DisplayModule = require('panels/display/display');
  var LazyLoader = require('shared/lazy_loader');

  var displayElements = {};

  return function ctor_display_panel() {
    var display = DisplayModule();

    return SettingsPanel({
      onInit: function dp_onInit(panel) {
        displayElements = {
          brightnessManual: panel.querySelector('.brightness-manual'),
          brightnessManualInput:
            panel.querySelector('.brightness-manual input'),
          brightnessAuto: panel.querySelector('.brightness-auto'),
          brightnessAutoCheckbox:
            panel.querySelector('.brightness-auto gaia-checkbox')
        };

        LazyLoader.getJSON('resources/device-features.json')
        .then(function(data) {
          display.init(displayElements, data);
        });
      }
    });
  };
});
