/**
 * BluetoothDevice:
 *   - BluetoothDevice is an Observable that wraps the platform
 *     BluetoothDevice object.
 *   - It has some observable properties: name, paired, cod
 * BluetoothDevice only update device information and does not involve in any
 *   UI logic.
 *
 * @module BluetoothDevice
 */
define(function(require) {
  'use strict';

  var BtClassOfDeviceMapper = require('modules/bluetooth/bluetooth_cod_mapper');
  var Observable = require('modules/mvvm/observable');

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function btd_debug(msg) {
      console.log('--> [BluetoothDevice]: ' + msg);
    };
  }

  /**
   * @class BluetoothDevice
   * @requires module:modules/mvvm/observable
   * @param {Object BluetoothDevice} device
   * @return {Observable} observableBluetoothDevice
   */
  return function ctor_bluetooth_device(device) {
    var type = BtClassOfDeviceMapper.getDeviceType(device.cod);
    var observableBluetoothDevice = Observable({
      name: device.name,
      paired: device.paired,
      address: device.address,
      type: type
    });

    /**
     * watch 'onattributechanged' event
     * A function to receive device which is just found via discovery handler.
     * And set a function to handle 'onattributechanged' event.
     */
    device.onattributechanged = function btd_onDeviceAttributeChanged(evt) {
      for (var i in evt.attrs) {
        Debug('onDeviceAttributeChanged(): ' + evt.attrs[i]);
        switch (evt.attrs[i]) {
          case 'name':
            observableBluetoothDevice.name = device.name;
            break;
          case 'paired':
            Debug('onDeviceAttributeChanged(): ' +
                  'device.paired = ' + device.paired);
            observableBluetoothDevice.paired = device.paired;
            break;
          default:
            break;
        }
      }
    };

    return observableBluetoothDevice;
  };
});
