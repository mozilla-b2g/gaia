/**
 * BluetoothAdapterManager:
 *   - BluetoothAdapterManager is an Observable that wraps the platform
 *     Bluetooth object for construct default adapter.
 *   - It has only one observable properties: defaultAdapter
 * BluetoothAdapterManager only update state and does not involve in any UI
 *   logic.
 *
 * @module BluetoothAdapterManager
 */
define(function(require) {
  'use strict';

  var NavigatorBluetooth = require('modules/navigator/mozBluetooth');
  var Observable = require('modules/mvvm/observable');

  var _debug = false;
  var Debug = function btam_debug(msg) {
    if (_debug) {
      console.log('--> [BluetoothAdapterManager]: ' + msg);
    }
  };

  /**
   * @alias module:modules/bluetooth/BluetoothAdapterManager
   * @requires module:modules/navigator/mozBluetooth
   * @requires module:modules/mvvm/observable
   * @return {BluetoothAdapterManager}
   */
  var BluetoothAdapterManager = {
    /**
     * The default adapter used to connect to the remote bluetooth devices.
     *
     * @readonly
     * @memberOf BluetoothAdapterManager
     * @type {Object}
     */
    defaultAdapter: null,

    /**
     * Init Bluetooth module.
     *
     * @access private
     * @memberOf BluetoothAdapterManager
     */
    _init: function btam__init() {
      // Early return while there is no navigator.mozBluetooth module.
      if (!NavigatorBluetooth) {
        return;
      }

      // watch BluetoothManager event
      this._watchMozBluetoothOnattributechanged();

      // init default adapter
      this._initDefaultAdapter();
    },

    /**
     * Watch 'onattributechanged' event from mozBluetooth for updating default
     * adapter information.
     *
     * 'onattributechanged' event description:
     * A handler to trigger when bluetooth manager's only property
     * defaultAdapter has changed.
     *
     * @access private
     * @memberOf BluetoothAdapterManager
     */
    _watchMozBluetoothOnattributechanged:
    function btam__watchMozBluetoothOnattributechanged() {
      NavigatorBluetooth.addEventListener('onattributechanged', (evt) => {
        for (var i in evt.attrs) {
          switch (evt.attrs[i]) {
            case 'defaultAdapter':
              // Default adapter attribute change.
              // Usually, it means that we reach new default adapter.
              this.defaultAdapter = NavigatorBluetooth.defaultAdapter;
              Debug('_watchMozBluetoothOnattributechanged(): ' +
                    'this.defaultAdapter = ' + this.defaultAdapter);
              break;
            default:
              break;
          }
        }
      });
    },

    /* Reach default adapter from platform Bluetooth.
     *
     * If the property is accessed on platform in the first time, it will
     * trigger Gecko::Bluetooth to get default adapter from the chipset.
     * So the value would be null.
     * Then we will receive 'onattributechanged' event later.
     *
     * @access private
     * @memberOf BluetoothAdapterManager
     */
    _initDefaultAdapter: function btam__initDefaultAdapter() {
      this.defaultAdapter = NavigatorBluetooth.defaultAdapter;
      Debug('_initDefaultAdapter(): this.defaultAdapter = ' +
            this.defaultAdapter);
    }
  };

  // Create the observable object using the prototype.
  var bluetoothAdapterManager = Observable(BluetoothAdapterManager);
  bluetoothAdapterManager._init();
  return bluetoothAdapterManager;
});
