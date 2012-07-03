/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
 /* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('DOMContentLoaded', function bluetoothSettings(evt) {
  var gBluetoothManager = navigator.mozBluetooth;
  // var _ = document.mozL10n.get;

  var gBluetoothPowerStatus = document.querySelector('#bluetooth-status small');
  
  var settings = window.navigator.mozSettings;
  if(settings) {
    var req = settings.getLock().get('bluetooth.enabled');
    req.onsuccess = function bt_EnabledFetched() {
      var enabled = req.result['bluetooth.enabled'];			
			var bluetooth = window.navigator.mozBluetooth;
			if (!bluetooth) {
				dump("Bluetooth not available!\n");
				return;
			}
			if (enabled) {
				document.querySelector('#bluetooth-status input').checked = true;
			}
    };
		req.onerror = function bt_EnabledFucked() {
			dump("Settings error!\n");
		};
  }
  
  document.querySelector('#bluetooth-status input').onchange = function() {
    var req = gBluetoothManager.setEnabled(this.checked);

    req.onsuccess = function() {
      var settings = window.navigator.mozSettings;
      if(!gBluetoothManager.enabled) {
        gBluetoothPowerStatus.textContent = 'Disabled';
        if (settings) {
          settings.getLock().set({'bluetooth.enabled': false});
        }
      } else {
        gBluetoothPowerStatus.textContent = 'Enabled';
        if (settings) {
          settings.getLock().set({'bluetooth.enabled': true});
        }
      }
    };
    req.onerror = function() {
      gBluetoothPowerStatus.textContent = 'Error';
    };
  };
});
