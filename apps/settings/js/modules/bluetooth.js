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

  var NavigatorBluetooth = require('modules/navigator/mozBluetooth');
  var BluetoothHelperModule = require('shared/bluetooth_helper');
  var Observable = require('modules/mvvm/observable');

  var settings = window.navigator.mozSettings;

  var BluetoothHelper = new BluetoothHelperModule();

  var bluetoothPrototype = {
    /**
     * Init Bluetooth module.
     *
     * @access private
     * @memberOf bluetoothPrototype
     */
    _init: function bt__init() {
      this.enabled = this._getEnabled();

      // Early return while there is no navigator.mozBluetooth module.
      if (!NavigatorBluetooth) {
        return;
      }

      if (this.enabled) {
        this._initPairedDevicesInfo();
        this._initAddressInfo();
      }

      this._watchMozBluetoothAdapteradded();
      this._watchMozBluetoothDisabled();
      this._watchPairedstatuschanged();
    },

    /**
     * Get enabled/diabled state from Bluetooth module.
     *
     * @access private
     * @memberOf bluetoothPrototype
     */
    _getEnabled: function bt__getEnabled() {
      if (NavigatorBluetooth) {
        return NavigatorBluetooth.enabled;
      } else {
        return false;
      }
    },

    /**
     * State of init for paired devices info. We only init paired devices info
     * one time while _init() or 'adapteradded' event comimg in first.
     *
     * @access public
     * @memberOf bluetoothPrototype
     * @type {Boolean}
     */
    _hasInitPairedDevicesInfo: false,

    /**
     * Init paired devices information.
     *
     * @access private
     * @memberOf bluetoothPrototype
     */
    _initPairedDevicesInfo: function bt__initPairedDevicesInfo() {
      if (!this._hasInitPairedDevicesInfo) {
        this._hasInitPairedDevicesInfo = true;
        this._refreshPairedDevicesInfo();
      }
    },

    /**
     * Init address information. If the BT address is in the Settings database,
     * it's already displayed in all `Bluetooth address' fields; if not,
     * it will be set as soon as BT is enabled.
     *
     * @access private
     * @memberOf bluetoothPrototype
     */
    _initAddressInfo: function bt__initAddressInfo() {
      if (!this.address && settings) {
        var self = this;
        var key = 'deviceinfo.bt_address';
        var req = settings.createLock().get(key);
        req.onsuccess = function bt_getAddressOnsuccess() {
          // save in module Bluetooth
          self.address = req.result[key];

          // If address is not recorded in settings DB, we will reach it after
          // getting adapter.
          if (!self.address && self.enabled) {
            BluetoothHelper.getAddress(function bt_gotAddress(address) {
              // save in Bluetooth module
              self.address = address;
              // save in settings DB
              var savedObj = {};
              savedObj[key] = self.address;
              settings.createLock().set(savedObj);
            });
          }
        };
      }
    },

    /**
     * Watch 'adapteradded' event from mozBluetooth for updating
     * enabled/disabled status.
     *
     * @access private
     * @memberOf bluetoothPrototype
     */
    _watchMozBluetoothAdapteradded: function bt__watchMozBTAdapteradded() {
      NavigatorBluetooth.addEventListener('adapteradded',
        function bt_adapteradded() {
          this.enabled = true;
          this._initPairedDevicesInfo();
          this._initAddressInfo();
      }.bind(this));
    },

    /**
     * Watch 'disabled' event from mozBluetooth for updating enabled/disabled
     * status.
     *
     * @access private
     * @memberOf bluetoothPrototype
     */
    _watchMozBluetoothDisabled: function bt__watchMozBluetoothDisabled() {
      NavigatorBluetooth.addEventListener('disabled',
        function bt_enabled() {
          this.enabled = false;
      }.bind(this));
    },

    /**
     * Watch 'onpairedstatuschanged' event from adapter for updating
     * paired devices information.
     *
     * @access private
     * @memberOf bluetoothPrototype
     */
    _watchPairedstatuschanged: function bt__watchPairedstatuschanged() {
      BluetoothHelper.onpairedstatuschanged = function() {
        // evt.status will be true/false for a specific device
        this._refreshPairedDevicesInfo();
      }.bind(this);
    },

    /**
     * Refresh paired devices information.
     *
     * @access private
     * @memberOf bluetoothPrototype
     */
    _refreshPairedDevicesInfo: function bt__refreshPairedDevicesInfo() {
      BluetoothHelper.getPairedDevices(function bt_gotPaired(result) {
        // copy for sorting
        var paired = result.slice();
        var length = paired.length;
        if (length !== 0) {
          paired.sort(function(a, b) {
            return a.name > b.name;
          });
          // set the name
          this.firstPairedDeviceName = paired[0].name;
        } else {
          // reset the name
          this.firstPairedDeviceName = '';
        }

        this.numberOfPairedDevices = length;
      }.bind(this));
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
