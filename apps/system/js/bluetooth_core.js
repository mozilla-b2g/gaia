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
      } else { // APIv2
        window.Bluetooth = window.Bluetooth2;
        window.BluetoothTransfer = window.BluetoothTransfer2;
        // window.Bluetooth = new window.Bluetooth2();
        // window.BluetoothTransfer = new BluetoothTransfer2();
        window.Bluetooth.start();
        window.BluetoothTransfer.start();
      }
    }
  });
}());
