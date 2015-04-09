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
   * Provide a function to update connection info.
   *
   * @access public
   * @memberOf BluetoothDevice
   * @param {Object} options
   * @param {Boolean} options.connectionStatus - is connected or not
   * @param {Object} options.profiles - profiles of the connection type
   */
  var updateConnectionInfo = function(options) {
    Debug('updateConnectionInfo(): this.address = ' + this.address +
          ', this.name = ' + this.name +
          ', options = ' + JSON.stringify(options));
    if (options.connectionStatus) {
      this.connectionStatus = options.connectionStatus;
    }

    if (options.profiles) {
      this.profiles = Object.create(options.profiles);
    }

    Debug('updateConnectionInfo(): this.connectionStatus = ' +
          this.connectionStatus + ', this.profiles = ' +
          JSON.stringify(this.profiles));
  };

  /**
   * Provide a function to update description text.
   *
   * @access public
   * @memberOf BluetoothDevice
   */
  var updateDescriptionText = function() {
    Debug('updateDescriptionText():');
    // Define description for found device.
    if (this.paired === false) {
      this.descriptionText = 'tapToConnect';
    } else if (this.paired === 'pairing') {
      this.descriptionText = 'pairing';
    } else if (this.paired === true) {
      this.descriptionText = 'paired';
      // Define description for paired device.
      if (this.connectionStatus === 'connecting') {
        this.descriptionText = 'connecting';
      } else if (this.connectionStatus === 'connected') {
        if (this.profiles) {
          var hfpConnected = this.profiles.hfp;
          var a2dpConnected = this.profiles.a2dp;
          if (hfpConnected && a2dpConnected) {
            this.descriptionText = 'connectedWithDeviceMedia';
          } else if (hfpConnected) {
            this.descriptionText = 'connectedWithDevice';
          } else if (a2dpConnected) {
            this.descriptionText = 'connectedWithMedia';
          } else {
            this.descriptionText = 'connectedWithNoProfileInfo';
          }
        } else {
          this.descriptionText = 'connectedWithNoProfileInfo';
        }
      } else if (this.connectionStatus === 'disconnected') {
        this.descriptionText = 'disconnected';
      }
    }
    Debug('updateDescriptionText(): this.descriptionText = ' +
          this.descriptionText);
  };

  /**
   * @class BluetoothDevice
   * @requires module:modules/mvvm/observable
   * @param {Object} BluetoothDevice device
   * @return {Observable} observableBluetoothDevice
   */
  return function ctor_bluetooth_device(device) {
    var type = BtClassOfDeviceMapper.getDeviceType(device.cod);
    var connectionStatus = device.connectionStatus || 'disconnected';
    var observableBluetoothDevice = Observable({
      name: device.name,
      paired: device.paired,
      address: device.address,
      type: type,
      connectionStatus: connectionStatus,
      profiles: null,
      descriptionText: '',
      get data() {return device;},
      updateConnectionInfo: updateConnectionInfo,
      updateDescriptionText: updateDescriptionText
    });

    /**
     * Observe 'paired', 'connectionStatus', and 'profiles' properties changed
     * event in init function. Once these properties changed, we can update 
     * corrected description for the device.
     */
    observableBluetoothDevice._init = function btd__init() {
      this.observe('paired', this.updateDescriptionText.bind(this));
      this.observe('connectionStatus', this.updateDescriptionText.bind(this));
      this.observe('profiles', this.updateDescriptionText.bind(this));
    };

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
          case 'cod':
            Debug('onDeviceAttributeChanged(): ' +
                  'device.cod = ' + device.cod);
            observableBluetoothDevice.type =
              BtClassOfDeviceMapper.getDeviceType(device.cod);
            break;
          default:
            break;
        }
      }
    };

    observableBluetoothDevice._init();
    return observableBluetoothDevice;
  };
});
