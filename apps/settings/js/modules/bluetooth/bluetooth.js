/**
 * Bluetooth:
 *   - Bluetooth is an Observable that wraps the platform Bluetooth object.
 *   - It has two observable properties: enabled and numberOfPairedDevices.
 * Bluetooth only update state and does not involve in any UI logic.
 *
 * @module Bluetooth
 */
define(function(require) {
  'use strict';

  var Observable = require('modules/mvvm/observable');

  var bluetoothPrototype = {
    /**
     * Init Bluetooth module.
     *
     * @access private
     * @memberOf bluetoothPrototype
     */
    _init: function bt__init() {
      // TODO: something here..
    },

    /**
     * State of Bluetooth.
     *
     * @readyonly
     * @memberOf bluetoothPrototype
     * @type {Boolean}
     */
    enabled: false,

    /**
     * Number of Bluetooth paired devices.
     *
     * @readyonly
     * @memberOf bluetoothPrototype
     * @type {Number}
     */
    numberOfPairedDevices: 0,

    /**
     * Device name of Bluetooth paired devices in the first sorting.
     *
     * @readyonly
     * @memberOf bluetoothPrototype
     * @type {String}
     */
    firstPairedDeviceName: '',

    /**
     * The adapter address of this device.
     *
     * @access public
     * @memberOf bluetoothPrototype
     * @type {String}
     */
    address: null
  };

  // Create the observable object using the prototype.
  var Bluetooth = Observable(bluetoothPrototype);
  Bluetooth._init();
  return Bluetooth;
});
