/* exported BluetoothCore */
/* global BaseModule, Bluetooth, BluetoothTransfer, NfcHandoverManager,
   LazyLoader */
'use strict';

(function() {
  var BluetoothCore = function(bluetooth) {
    this.bluetooth = bluetooth;
  };

  /**
   * BluetoothCore handle bluetooth related function and bootstrap
   * modules for v1/v2 API.
   *
   * @class BluetoothCore
   */
  BaseModule.create(BluetoothCore, {
    name: 'BluetoothCore',

    start: function() {
      // init Bluetooth module
      if (typeof(window.navigator.mozBluetooth.onattributechanged) ===
        'undefined') { // APIv1
          LazyLoader.load([
            'js/bluetooth.js',
            'js/bluetooth_transfer.js',
            'js/nfc_handover_manager.js'
          ]).then(function() {
            Bluetooth.init();
            BluetoothTransfer.init();
            NfcHandoverManager.init();
          });
      }
    }
  });
}());
