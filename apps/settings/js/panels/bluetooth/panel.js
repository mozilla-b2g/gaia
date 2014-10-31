/**
 * The Bluetooth panel
 *
 * Bluetooth v2 panel, still on working..
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');

  return function ctor_bluetooth() {
    var elements;

    return SettingsPanel({
      onInit: function(panel) {
        this._settings = navigator.mozSettings;

        elements = {
          panel: panel,
          bluetoothCheckbox: panel.querySelector('.bluetooth-status input')
        };
      }
    });
  };
});
