/* exported BluetoothCore */
/* global BaseModule, Bluetooth, BluetoothTransfer */
'use strict';

(function() {
  var BluetoothCore = function(bluetooth) {
    this.bluetooth = bluetooth;
  };

  BluetoothCore.IMPORTS = [
    'shared/js/mime_mapper.js'
  ];

  /**
   * BluetoothCore handle bluetooth related function and bootstrap
   * modules for v1/v2 API.
   *
   * @class BluetoothCore
   */
  BaseModule.create(BluetoothCore, {
    name: 'BluetoothCore',

    _start: function() {
      console.log('1');
      // init Bluetooth module
      if (typeof(window.navigator.mozBluetooth.onattributechanged) ===
        'undefined') { // APIv1

      console.log('2');
        BaseModule.lazyLoad(
          ['Bluetooth', 'BluetoothTransfer']).then(function() {

      console.log('3');
            Bluetooth.start();
            BluetoothTransfer.start();

      console.log('4');
          });
      }
    }
  });
}());
