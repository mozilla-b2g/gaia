/**
 * BluetoothContext:
 *   - BluetoothContext is an Observable that wraps the platform Bluetooth
 *     object.
 *   - BluetoothContext is a singleton that you can easily use it to fetch some
 *     shared data across different panels.
 *   - It has some observable properties: state, enabled, address, name,
 *     discoverable, discovering, numberOfPairedDevices, firstPairedDeviceName,
 *     hasPairedDevice.
 *   - It has two observable array: _pairedDevices, _remoteDevices.
 * BluetoothContext only update state and does not involve in any UI logic.
 *
 * @module BluetoothContext
 */
define(function(require) {
  'use strict';

  var AdapterManager = require('modules/bluetooth/bluetooth_adapter_manager');
  var BtDevice = require('modules/bluetooth/bluetooth_device');
  var Observable = require('modules/mvvm/observable');
  var ObservableArray = require('modules/mvvm/observable_array');
  var SettingsCache = require('modules/settings_cache');

  var settings = navigator.mozSettings;

  var _debug = false;
  var Debug = function btc_debug(msg) {
    if (_debug) {
      console.log('--> [BluetoothContext]: ' + msg);
    }
  };

  var BluetoothContext = {
    /**
     * State of Bluetooth default adapter.
     * This is an enum of BluetoothAdapterState.
     * State: 'disabled', 'disabling', 'enabled', 'enabling'
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {String}
     */
    state: 'disabled',

    /**
     * State of Bluetooth.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {Boolean}
     */
    enabled: false,

    /**
     * The address of the device's adapter on the bluetooth micro-network.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {String}
     */
    address: null,

    /**
     * The human readable name of the device's adapter.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {String}
     */
    name: '',

    /**
     * Indicates if the device is discoverable (true) or not (false)
     * by other bluetooth devices.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {Boolean}
     */
    discoverable: false,

    /**
     * Indicates if the device is in the process of discovering (true) or
     * not (false) surrounding bluetooth devices.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {Boolean}
     */
    discovering: false,

    /**
     * Number of Bluetooth paired devices.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {Number}
     */
    numberOfPairedDevices: 0,

    /**
     * Device name of Bluetooth paired devices in the first sorting.
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {String}
     */
    firstPairedDeviceName: '',

    /**
     * Indicates if the paired device is in the paired devices list (true) or
     * not (false).
     *
     * @readonly
     * @memberOf BluetoothContext
     * @type {Boolean}
     */
    hasPairedDevice: false,

    /**
     * Default adapter of Bluetooth.
     *
     * @access private
     * @memberOf BluetoothContext
     * @type {Object BluetoothAdapter}
     */
    _defaultAdapter: null,

    /**
     * Init BluetoothContext module.
     *
     * @access private
     * @memberOf BluetoothContext
     */
    _init: function btc__init() {
      // Observe 'defaultAdapter' property for reaching default adapter.
      AdapterManager.observe('defaultAdapter',
                             this._onDefaultAdapterChanged);
      this._onDefaultAdapterChanged(AdapterManager.defaultAdapter);
    },

    /**
     * Init properties from default adapter.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} adapter
     */
    _initProperties: function btc__initProperties(adapter) {
      // init observable properties
      this._updateStatus(adapter.state);
      this.address = adapter.address;
      this.name = adapter.name;
      this.discoverable = adapter.discoverable;
      this.discovering = adapter.discovering;

      // init paired device information
      this._refreshPairedDevicesInfo(adapter);
    },

    /**
     * Only reset properties since there is no available default adapter.
     *
     * @access private
     * @memberOf BluetoothContext
     */
    _resetProperties: function btc__resetProperties() {
      this._updateStatus('disabled');
      this.address = '';
      this.name = '';
      this.discoverable = false;
      this.discovering = false;
    },

    /**
     * Watch 'onattributechanged' event from default adapter for updating
     * enabled/disabled status immediately.
     *
     * Description of 'onattributechanged' event:
     * A handler to trigger when one of the local bluetooth adapter's properties
     * has changed. Note access to the changed property in this event handler
     * would get the updated value.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} adapter
     */
    _watchDefaultAdapterOnattributechanged:
    function btc__watchDefaultAdapterOnattributechanged(adapter) {
      adapter.onattributechanged =
        this._onAdapterAttributeChanged.bind(this, adapter);
    },

    /**
     * Unwatch 'onattributechanged' event from default adapter since adapter is
     * removed.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} adapter
     */
    _unwatchDefaultAdapterOnattributechanged:
    function btc__unwatchDefaultAdapterOnattributechanged(adapter) {
      adapter.onattributechanged = null;
    },

    /**
     * Watch 'ondevicepaired' event from default adapter for updating paired
     * device immediately.
     *
     * Description of 'ondevicepaired' event:
     * A handler to trigger when a remote device gets paired with local
     * bluetooth adapter.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} adapter
     */
    _watchDefaultAdapterOndevicepaired:
    function btc__watchDefaultAdapterOndevicepaired(adapter) {
      adapter.ondevicepaired =
        this._onAdapterDevicepaired.bind(this, adapter);
    },

    /**
     * Unwatch 'ondevicepaired' event from default adapter since adapter is
     * removed.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} adapter
     */
    _unwatchDefaultAdapterOndevicepaired:
    function btc__unwatchDefaultAdapterOndevicepaired(adapter) {
      adapter.ondevicepaired = null;
    },

    /**
     * Watch 'ondeviceunpaired' event from default adapter for updating unpaired
     * device immediately.
     *
     * Description of 'ondeviceunpaired' event:
     * A handler to trigger when a remote device gets unpaired from local
     * bluetooth adapter.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} adapter
     */
    _watchDefaultAdapterOndeviceunpaired:
    function btc__watchDefaultAdapterOndeviceunpaired(adapter) {
      adapter.ondeviceunpaired =
        this._onAdapterDeviceunpaired.bind(this, adapter);
    },

    /**
     * Unwatch 'ondeviceunpaired' event from default adapter since adapter is
     * removed.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} adapter
     */
    _unwatchDefaultAdapterOndeviceunpaired:
    function btc__unwatchDefaultAdapterOndeviceunpaired(adapter) {
      adapter.ondeviceunpaired = null;
    },

    /**
     * 'onattributechanged' event handler from default adapter for updating
     * latest BluetoothContext information.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} adapter
     * @param {event} evt
     */
    _onAdapterAttributeChanged:
    function btc__onAdapterAttributeChanged(adapter, evt) {
      for (var i in evt.attrs) {
        Debug('--> _onAdapterAttributeChanged(): ' + evt.attrs[i]);
        switch (evt.attrs[i]) {
          case 'state':
            this._updateStatus(adapter.state);
            if (adapter.state === 'enabled') {
              // Manually start discovery while the adapter state
              // is already enabled.
              this.startDiscovery();
            }
            break;
          case 'address':
            this.address = adapter.address;
            break;
          case 'name':
            this.name = adapter.name;
            break;
          case 'discoverable':
            this.discoverable = adapter.discoverable;
            break;
          case 'discovering':
            this.discovering = adapter.discovering;
            break;
          default:
            break;
        }
      }
    },

    /**
     * 'ondevicepaired' event handler from default adapter for updating paired
     * device in remote/paired devices list.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} adapter
     * @param {event} evt
     */
    _onAdapterDevicepaired:
    function btc__onAdapterDevicepaired(adapter, evt) {
      Debug('_onAdapterDevicepaired evt = ' + evt);
      // have to get device object in this event handler Ex. evt --> device

      // Instead of adding the paired device in paired devices list,
      // get paired devices from adapter directly.
      this._refreshPairedDevicesInfo(adapter);
    },

    /**
     * 'ondeviceunpaired' event handler from default adapter for updating
     * unpaired device in remote/paired devices list.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} adapter
     * @param {event} evt
     */
    _onAdapterDeviceunpaired:
    function btc__onAdapterDeviceunpaired(adapter, evt) {
      Debug('_onAdapterDeviceunpaired evt = ' + evt);
      // have to get the device address in this event handler Ex. evt -> address

      // Instead of removing the paired device from paired devices list,
      // get paired devices from adapter directly.
      this._refreshPairedDevicesInfo(adapter);
    },

    /**
     * 'defaultAdapter' change event handler from adapter manager for
     * watch/unwatch default adapter relative event immediately.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} newAdapter
     * @param {Object BluetoothAdapter} oldAdapter
     */
    _onDefaultAdapterChanged:
    function btc__onDefaultAdapterChanged(newAdapter, oldAdapter) {
      Debug('_onDefaultAdapterChanged(): newAdapter = ' + newAdapter);
      Debug('_onDefaultAdapterChanged(): oldAdapter = ' + oldAdapter);

      // save default adapter
      this._defaultAdapter = newAdapter;

      if (oldAdapter) {
        // unwatch event since the old adapter is no longer usefull
        this._unwatchDefaultAdapterOnattributechanged(oldAdapter);
        this._unwatchDefaultAdapterOndeviceunpaired(oldAdapter);
        this._unwatchDefaultAdapterOndevicepaired(oldAdapter);
      }

      if (newAdapter) {
        // watch event since the new adapter is ready to access
        this._initProperties(newAdapter);
        this._watchDefaultAdapterOnattributechanged(newAdapter);
        this._watchDefaultAdapterOndevicepaired(newAdapter);
        this._watchDefaultAdapterOndeviceunpaired(newAdapter);
      } else {
        // reset properties only
        this._resetProperties();
      }
    },

    /**
     * Refresh paired devices information.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothAdapter} adapter
     */
    _refreshPairedDevicesInfo: function btc__refreshPairedDevicesInfo(adapter) {
      var pairedDevices = adapter.getPairedDevices();
      Debug('pairedDevices.length = ' + pairedDevices.length);

      // reset paired devices list
      this._pairedDevices.reset([]);

      // refresh properties about paired devices
      if (pairedDevices.length === 0) {
        // reset the name
        this.firstPairedDeviceName = '';
        // update property 'hasPairedDevice'
        this.hasPairedDevice = false;
      } else {
        // save paired devices in list
        for (var i in pairedDevices) {
          // create observable BtDevice
          var observableBtDevice = BtDevice(pairedDevices[i]);
          // push device in devices list with observable object
          this._pairedDevices.push(observableBtDevice);
        }

        // sort paired devices in list
        this._pairedDevices.array.sort(function(a, b) {
          return a.name > b.name;
        });
        // set the name
        this.firstPairedDeviceName = this._pairedDevices[0].name;
        // update property 'hasPairedDevice'
        this.hasPairedDevice = true;
      }

      this.numberOfPairedDevices = pairedDevices.length;
    },

    /**
     * Since we have three properties which are relative with hardware status,
     * update them via this method here.
     * Update status, enabled, settings key 'bluetooth.enabled'
     * The input state would be {'disabled', 'disabling', 'enabled', 'enabling'}
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {String} state
     */
    _updateStatus: function btc__updateStatus(state) {
      // Wrapper state to enabled/disabled toggle state.
      var enabled;
      if (state === 'enabled' || state === 'disabling') {
        enabled = true;
      } else if (state === 'disabled' || state === 'enabling') {
        enabled = false;
      }

      // Sync with settings key
      SettingsCache.getSettings((results) => {
        var btEnabled = results['bluetooth.enabled'];
        if (btEnabled !== enabled) {
          settings.createLock().set({'bluetooth.enabled': enabled});
        }

        // Update state
        this.state = state;
        Debug('_updateStatus(): set state = ' + state);

        // Update enabled
        this.enabled = enabled;
        Debug('_updateStatus(): set enabled = ' + enabled);
      });
    },

    /**
     * Set Bluetooth enable/disable.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {Boolean} enabled
     * @returns {Promise}
     */
    setEnabled: function btc_setEnabled(enabled) {
      Debug('setEnabled(): request set enabled = ' + enabled);
      if ((this.enabled === enabled) ||
          (this.state === 'enabling') ||
          (this.state === 'disabling')) {
        return Promise.reject('state transition!!');
      }

      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }

      if (enabled) {
        return this._defaultAdapter.enable().then(() => {
          Debug('setEnabled(): set enable successfully :)');
        }, (reason) => {
          Debug('setEnabled(): set enable failed: reason = ' + reason);
          return Promise.reject(reason);
        });
      } else {
        return this._defaultAdapter.disable().then(() => {
          Debug('setEnabled(): set disable successfully :)');
        }, (reason) => {
          Debug('setEnabled(): set disable failed: reason = ' + reason);
          return Promise.reject(reason);
        });
      }
    },

    /**
     * Set Bluetooth discoverable.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {Boolean} enabled
     * @returns {Promise}
     */
    setDiscoverable: function btc_setDiscoverable(enabled) {
      if ((this.discoverable === enabled) || (this.state !== 'enabled')) {
        return Promise.reject('same state or Bluetooth is disabled!!');
      }

      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }

      return this._defaultAdapter.setDiscoverable(enabled).then(() => {
        Debug('setDiscoverable(): set discoverable ' + 
              enabled + ' successfully :)');
      }, (reason) => {
        Debug('setDiscoverable(): set discoverable failed: ' + 
              'reason = ' + reason);
        return Promise.reject(reason);
      });
    },

    /**
     * Set adapter name.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {String} name
     * @returns {Promise}
     */
    setName: function btc_setName(name) {
      if (name === this.name) {
        return Promise.reject('same name!!');
      }

      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }

      return this._defaultAdapter.setName(name).then(() => {
        Debug('setName(): set name successfully :) name = ' +
              this._defaultAdapter.name);
      }, (reason) => {
        Debug('setName(): set name failed: reason = ' + reason);
        return Promise.reject(reason);
      });
    },

    /**
     * Set adapter name by product model.
     *
     * @access public
     * @memberOf BluetoothContext
     */
    setNameByProductModel: function btc_setNameByProductModel() {
      // Bug 847459: Default name of the bluetooth device is set by bluetoothd
      // to the value of the Android ro.product.model property upon first
      // start. In case the user gives an empty bluetooth device name, we want
      // to revert to the original ro.product.model. Gecko exposes it under
      // the deviceinfo.product_model setting.
      SettingsCache.getSettings((results) => {
        var productModel = results['deviceinfo.product_model'];
        Debug('setNameByProductModel(): productModel = ' + productModel);
        this.setName(productModel);
      });
    },

    /**
     * An observable array to maintain paired devices which are just found out.
     *
     * @access private
     * @memberOf BluetoothContext
     * @type {ObservableArray}
     */
    _pairedDevices: ObservableArray([]),

    /**
     * An observable array to maintain remote devices which are just found out.
     *
     * @access private
     * @memberOf BluetoothContext
     * @type {ObservableArray}
     */
    _remoteDevices: ObservableArray([]),

    /**
     * An handler to handle 'ondevicefound' event. Then, we can save and update
     * found device in the remote devices array.
     *
     * @access private
     * @memberOf BluetoothContext
     * @type {Function}
     */
    _discoveryHandler: null,

    /**
     * The method makes the device's adapter start seeking for remote devices.
     * The discovery process may be terminated after discovering a period of
     * time. If the startDiscovery operation succeeds, an onattributechanged
     * event would be triggered before the Promise is resolved to indicate
     * property discovering becomes true.
     *
     * @access public
     * @memberOf BluetoothContext
     * @type {Function}
     * @returns {Promise}
     */
    startDiscovery: function btc_startDiscovery() {
      if ((this.discovering === true) || (this.state !== 'enabled')) {
        return Promise.reject('same state or Bluetooth is disabled!!');
      }

      // clean up found devices list
      this._remoteDevices.reset([]);

      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }

      return this._defaultAdapter.startDiscovery().then((handle) => {
        Debug('startDiscovery(): startDiscovery successfully :)');
        // Keep reference to handle in order to listen to
        // ondevicefound event handler
        this._setDiscoveryHandler(handle);
      }, (reason) => {
        Debug('startDiscovery(): startDiscovery failed: ' + 
              'reason = ' + reason);
        return Promise.reject(reason);
      });
    },

    /**
     * The method makes the device's adapter stop seeking for remote devices.
     * This is an asynchronous method and its result is returned via a Promise.
     * If the stopDiscovery operation succeeds, an onattributechanged would be
     * triggered before the Promise is resolved to indicate property discovering
     * becomes false. Note adapter may still receive
     * BluetoothDiscoveryHandle.ondevicefound event until the Promise is
     * resolved.
     *
     * @access public
     * @memberOf BluetoothContext
     * @type {Function}
     * @returns {Promise}
     */
    stopDiscovery: function btc_stopDiscovery() {
      if ((this.discovering === false) || (this.state !== 'enabled')) {
        return Promise.reject('same state or Bluetooth is disabled!!');
      }

      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }

      return this._defaultAdapter.stopDiscovery().then(() => {
        Debug('stopDiscovery(): stopDiscovery successfully :)');
      }, (reason) => {
        Debug('stopDiscovery(): stopDiscovery failed: reason = ' + reason);
        return Promise.reject(reason);
      });
    },

    /**
     * A function to receive BluetoothDiscoveryHandle. And set a function to
     * handle 'ondevicefound' event.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object BluetoothDiscoveryHandle} handle
     */
    _setDiscoveryHandler: function btc__setDiscoveryHandler(handle) {
      Debug('_setDiscoveryHandler(): handle = ' + handle);
      // make the code base easy to do unit test
      this._discoveryHandler = handle;
      this._discoveryHandler.ondevicefound = this._onDeviceFound.bind(this);
    },

    /**
     * Handle 'ondevicefound' event to access remote device in list with
     * observable object.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object} evt
     */
    _onDeviceFound: function btc__onDeviceFound(evt) {
      // save device
      this._saveDevice(evt.device);
    },

    /**
     * To distinguish between paired and unpaired.
     * Then, save/update the device in list corresponding to the state of
     * property paired.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object Observable} device
     */
    _saveDevice: function btc__saveDevice(device) {
      // distinguish the found device is paired or not
      var operatingDevices =
        (device.paired) ? this.getPairedDevices() : this.getRemoteDevices();

      // check the device is existed or not in remote/paired devices array
      var index = operatingDevices.array.findIndex(
                    this._findDeviceByAddress.bind(this, device.address));

      // If the device is not existed yet, create observable object
      // for saving this device.
      if (index === -1) {
        // create observable BtDevice
        var observableBtDevice = BtDevice(device);
        // push device in devices list with observable object
        operatingDevices.push(observableBtDevice);
      } else {
        // The device is existed, no need to do any thing here.
        // set device in devices list
        // operatingDevices.set(index, device);
      }
    },

    /**
     * Given address to find out device element from array.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {String} address
     * @param {Observable BluetoothDevice} btDevice
     * @return {Boolean}
     */
    _findDeviceByAddress:
    function btc__findDeviceByAddress(address, btDevice) {
      return btDevice.address && (btDevice.address === address);
    },

    /**
     * Return paired devices list which is maintained in BluetoothContext.
     *
     * @access public
     * @memberOf BluetoothContext
     * @return {Observable Array}
     */
    getPairedDevices: function btc_getPairedDevices() {
      return this._pairedDevices;
    },

    /**
     * Return remote devices list which is maintained in BluetoothContext.
     *
     * @access public
     * @memberOf BluetoothContext
     * @return {Observable Array}
     */
    getRemoteDevices: function btc_getRemoteDevices() {
      return this._remoteDevices;
    },

    /**
     * The method starts pairing a remote device with the device's adapter.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {String} address
     * @returns {Promise}
     */
    pair: function btc_pair(address) {
      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }

      return this._defaultAdapter.pair(address).then(() => {
        Debug('pair(): Resolved with void value');
      }, (reason) => {
        Debug('pair(): Reject with this reason: ' + reason);
        return Promise.reject(reason);
      });
    },

    /**
     * The method starts unpairs a remote device with the device's adapter.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {String} address
     * @returns {Promise}
     */
    unpair: function btc_unpair(address) {
      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }

      return this._defaultAdapter.unpair(address).then(() => {
        Debug('unpair(): Resolved with void value');
      }, (reason) => {
        Debug('unpair(): Reject with this reason: ' + reason);
        return Promise.reject(reason);
      });
    }
  };

  // Create the observable object using the prototype.
  var bluetoothContext = Observable(BluetoothContext);
  bluetoothContext._init();
  return bluetoothContext;
});
