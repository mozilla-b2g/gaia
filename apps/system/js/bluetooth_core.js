/* exported BluetoothCore */
/* global BaseModule, LazyLoader, Bluetooth2 */
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

    _start: function() {
      return LazyLoader.load(['js/bluetooth_v2.js']).then(function() {
        window.Bluetooth = new Bluetooth2();
        return window.Bluetooth.start();
      });
    }
  });
}());
