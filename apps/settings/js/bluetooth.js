/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// create a fake mozBluetooth if required (e.g. desktop browser)
var gBluetooth = (function(window) {
  var navigator = window.navigator;
  if (('mozBluetooth' in navigator) && navigator.mozBluetooth)
    return navigator.mozBluetooth;

  var enabled = false;
  return {
    get enabled() {
      return enabled;
    },
    setEnabled: function(value) {
      enabled = value;
      return { // fake DOM request
        set onsuccess(callback) { setTimeout(callback, 500); },
        set onerror(callback) {}
      };
    }
  };
})(this);

// handle BlueTooth settings
window.addEventListener('localized', function bluetoothSettings(evt) {
  var _ = navigator.mozL10n.get;
  var settings = window.navigator.mozSettings;
  var infoBlock = document.querySelector('#bluetooth-status small');

  // display Bluetooth power state
  function updatePowerState(error) {
    if (error) {
      infoBlock.textContent = _('error');
    } else {
      infoBlock.textContent = gBluetooth.enabled ? _('enabled') : _('disabled');
    }
  }

  // enable Bluetooth if the related settings says so
  // XXX this should rather be done in `System' than in `Settings'...
  if (settings) {
    var req = settings.getLock().get('bluetooth.enabled');

    req.onsuccess = function bt_EnabledSuccess() {
      var enabled = req.result['bluetooth.enabled'];
      gBluetooth.setEnabled(enabled);
      document.querySelector('#bluetooth-status input').checked = enabled;
    };

    req.onerror = function bt_EnabledError() {
      console.log('Settings error when reading bluetooth setting!');
    };
  }

  // update BT description and setting
  function changeBT() {
    infoBlock.textContent = '';
    var req = gBluetooth.setEnabled(this.checked);

    req.onsuccess = function bt_enabledSuccess() {
      updatePowerState();
      if (settings) {
        settings.getLock().set({
          'bluetooth.enabled': gBluetooth.enabled
        });
      }
    };

    req.onerror = function bt_enabledError() {
      updatePowerState(true);
    };
  };

  // activate main button
  document.querySelector('#bluetooth-status input').onchange = changeBT;
  updatePowerState();
});

