/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

navigator.mozL10n.ready(function SettingsFactoryReset() {
  var _ = navigator.mozL10n.get;

  function factoryReset() {
    var power = navigator.mozPower;
    if (!power) {
      console.error('Cannot get mozPower');
      return;
    }

    if (!power.factoryReset) {
      console.error('Cannot invoke mozPower.factoryReset()');
      return;
    }

    power.factoryReset();
  }

  var resetButton = document.getElementById('reset-phone');
  if (resetButton) {
    resetButton.addEventListener('click', function reset_click(evt) {
      // XXX: need to refine this part when the visual design is done
      var msg = _('reset-warning-1') + '\n' + _('reset-warning-2');
      var response = window.confirm(msg);
      if (response) {
        factoryReset();
      }
    });
  }
});

