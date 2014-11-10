define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SimPin = require('panels/simpin/simpin');

  return function ctor_simpin_panel() {
    return SettingsPanel({
      onInit: function(panel) {
        var elements = {};
        // We will fix this when SettingsDialog is ready
        elements.dialog = document.getElementById('simpin-dialog');
        elements.simPinTmpl = panel.querySelector('.simpin-tmpl');
        elements.simPinContainer = panel.querySelector('.simpin-container');
        elements.simPinHeader = panel.querySelector('.simpin-header');

        var simpin = SimPin(elements);
        simpin.init();
      }
    });
  };
});
