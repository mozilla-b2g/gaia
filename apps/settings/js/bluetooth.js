/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle BlueTooth settings
window.addEventListener('localized', function bluetoothSettings(evt) {
  var _ = navigator.mozL10n.get;
  var settings = window.navigator.mozSettings;
  var gBluetoothInfoBlock = document.querySelector('#bluetooth-status small');
  var gBluetoothCheckBox = document.querySelector('#bluetooth-status input');

  // display Bluetooth power state
  function updatePowerState(value) {
    gBluetoothInfoBlock.textContent = value ? _('enabled') : _('disabled');
    gBluetoothCheckBox.checked = value;
  }

  // activate main button
  gBluetoothCheckBox.onchange = function changeBT() {
    if (settings) {
      settings.getLock().set({'bluetooth.enabled': this.checked});
    }
  };

  // enable Bluetooth if the related settings says so
  if (settings) {
    // register an observer to monitor bluetooth.enabled changes
    settings.addObserver('bluetooth.enabled', function(event) {
      updatePowerState(event.settingValue);
    });

    // startup, update status
    var req = settings.getLock().get('bluetooth.enabled');

    req.onsuccess = function bt_EnabledSuccess() {
      var enabled = req.result['bluetooth.enabled'];
      updatePowerState(enabled);
    };
  }

});

