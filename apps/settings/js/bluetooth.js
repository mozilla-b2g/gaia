/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('DOMContentLoaded', function bluetoothSettings(evt) {
  var gBluetoothPowerStatus = document.querySelector('#bluetooth-status small');
  var gBluetoothCheckBox = document.querySelector('#bluetooth-status input');

  var settings = window.navigator.mozSettings;
  if (settings) {
    settings.addObserver('bluetooth.enabled', function(event) {
      if (event.settingValue) {
        gBluetoothPowerStatus.textContent = 'Enabled';
      }
      else {
        gBluetoothPowerStatus.textContent = 'Disabled';
      }
      gBluetoothCheckBox.checked = event.settingValue;
    });

    var req = settings.getLock().get('bluetooth.enabled');
    req.onsuccess = function bt_EnabledSuccess() {
      var enabled = req.result['bluetooth.enabled'];
      if (enabled) {
        gBluetoothPowerStatus.textContent = 'Enabled';
      }
      else {
        gBluetoothPowerStatus.textContent = 'Disabled';
      }
      gBluetoothCheckBox.checked = enabled;
    };

    req.onerror = function bt_EnabledError() {
      console.log('Settings error when reading bluetooth setting!');
    };

  }

  function changeBT() {
    if (settings) {
      settings.getLock().set({
        'bluetooth.enabled': this.checked
      });
    }
  };

  document.querySelector('#bluetooth-status input').onchange = changeBT;
});
