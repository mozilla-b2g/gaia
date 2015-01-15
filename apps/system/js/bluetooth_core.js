/* exported BluetoothCore */
/* global BaseModule */
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
          window.Bluetooth = window.Bluetooth1;
          window.BluetoothTransfer = window.BluetoothTransfer1;
          window.Bluetooth.init();
          window.BluetoothTransfer.init();
          window.NfcHandoverManager.init();
      }
    }
  });
}());
