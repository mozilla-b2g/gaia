/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This library displays the connectivity status in the main panel without
 * requiring the full `carrier.js' + `bluetooth.js' libraries.
 */

// TODO: handle hotspot status

// display connectivity status on the main panel
var Connectivity = (function(window, document, undefined) {
  var _bluetooth_address = '';
  var _initialized = false;
  var _macAddress = '';
  var SettingsCache = require('modules/settings_cache');

  // in desktop helper we fake these device interfaces if they don't exist.
  var bluetooth = getBluetooth();
  var mobileConnection = getMobileConnection();

  var initOrder = [
    updateBluetooth
  ];

  var settings = navigator.mozSettings;

  // Register callbacks to track the state of the bluetooth hardware
  if (bluetooth) {
    bluetooth.addEventListener('adapteradded', function() {
      dispatchEvent(new CustomEvent('bluetooth-adapter-added'));
      updateBluetooth();
    });
    bluetooth.addEventListener('disabled', function() {
      dispatchEvent(new CustomEvent('bluetooth-disabled'));
      updateBluetooth();
    });
  }

  window.addEventListener('bluetooth-pairedstatuschanged', updateBluetooth);

  function lazyInit(index) {
    if (index >= initOrder.length) {
      return;
    }

    initOrder[index]();
    setTimeout(lazyInit.bind(this, index + 1));
  }

  // called when localization is done
  function init() {
    if (_initialized) {
      return;
    }
    _initialized = true;

    lazyInit(0);
  }

  /**
   * Bluetooth Manager
   */

  function updateBluetooth() {
    if (!bluetooth) {
      return;
    }
    var bluetoothDesc = document.getElementById('bluetooth-desc');
    // if 'adapteradd' or 'disabled' event happens before init
    if (!_initialized) {
      init();
      return; // init will call updateBluetooth()
    }

    var l10nId = bluetooth.enabled ? 'bt-status-nopaired' : 'bt-status-turnoff';
    bluetoothDesc.setAttribute('data-l10n-id', l10nId);

    if (!bluetooth.enabled) {
      return;
    }

    // If the BT address is in the Settings database, it's already displayed in
    // all `Bluetooth address' fields; if not, it will be set as soon as BT is
    // enabled.
    if (!_bluetooth_address && settings) {
      var req = settings.createLock().get('deviceinfo.bt_address');
      req.onsuccess = function btAddr_onsuccess() {
        _bluetooth_address = req.result['deviceinfo.bt_address'];
      };
    }

    var req = bluetooth.getDefaultAdapter();
    req.onsuccess = function bt_getAdapterSuccess() {
      var defaultAdapter = req.result;

      // Set Bluetooth address after getting the adapter if it wasn't already
      // done so earlier.
      if (!_bluetooth_address && defaultAdapter.address) {
        _bluetooth_address = defaultAdapter.address;

        settings.createLock().set({ 'deviceinfo.bt_address':
                                   _bluetooth_address });
        // update UI fields
        var fields =
          document.querySelectorAll('[data-name="deviceinfo.bt_address"]');
        for (var i = 0, l = fields.length; i < l; i++) {
          fields[i].textContent = _bluetooth_address;
        }
      }

      var reqPaired = defaultAdapter.getPairedDevices();
      reqPaired.onsuccess = function bt_getPairedSuccess() {
        // copy for sorting
        var paired = reqPaired.result.slice();
        var length = paired.length;
        if (length == 0) {
          return;
        }
        paired.sort(function(a, b) {
          return a.name > b.name;
        });

        navigator.mozL10n.setAttributes(bluetoothDesc, 'bt-status-paired',
          { name: paired[0].name, n: length - 1 });
      };
    };
  }

  /**
   * Public API, in case a "Connectivity" sub-panel needs it
   */

  return {
    init: init,
    updateBluetooth: updateBluetooth
  };
})(this, document);
