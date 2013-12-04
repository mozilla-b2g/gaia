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
      var resetDialog = document.getElementById('reset-phone-dialog');
      var resetConfirm = document.getElementById('confirm-reset-phone');
      var resetCancel = document.getElementById('cancel-reset-phone');

      resetDialog.hidden = false;
      resetCancel.onclick = function() {
        resetDialog.hidden = true;
      };
      resetConfirm.onclick = function() {
        factoryReset();
      };
    });
  }
});

