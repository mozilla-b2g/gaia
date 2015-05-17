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
  var ConnectionManager =
    require('modules/bluetooth/bluetooth_connection_manager');
  var Observable = require('modules/mvvm/observable');
  var ObservableArray = require('modules/mvvm/observable_array');

  var settings = navigator.mozSettings;

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function btc_debug(msg) {
      console.log('--> [BluetoothContext]: ' + msg);
    };
  }

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
     * @type {Object} BluetoothAdapter
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
                             this._onDefaultAdapterChanged.bind(this));
      this._onDefaultAdapterChanged(AdapterManager.defaultAdapter);

      // Watch 'connecting' event for reaching connecting device.
      ConnectionManager.addEventListener('connecting',
        this._updateDeviceConnectionInfo.bind(this));

      // Watch 'connected' event for reaching connected device.
      ConnectionManager.addEventListener('connected',
        this._updateDeviceConnectionInfo.bind(this));

      // Watch 'disconnected' event for reaching disconnected device.
      ConnectionManager.addEventListener('disconnected',
        this._updateDeviceConnectionInfo.bind(this));

      // Watch 'profileChange' event for reaching device connection profile.
      ConnectionManager.addEventListener('profileChanged',
        this._updateDeviceConnectionInfo.bind(this));
    },

    /**
     * Init properties from default adapter.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object} BluetoothAdapter adapter
     */
    _initProperties: function btc__initProperties(adapter) {
      // init observable properties
      this._updateStatus(adapter.state);
      this.address = adapter.address;
      this.name = adapter.name;
      this.discoverable = adapter.discoverable;
      this.discovering = adapter.discovering;
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
     * @param {Object} BluetoothAdapter adapter
     */
    _watchDefaultAdapterOnattributechanged:
    function btc__watchDefaultAdapterOnattributechanged(adapter) {
      adapter.addEventListener('attributechanged',
        this._onAdapterAttributeChanged.bind(this, adapter));
    },

    /**
     * Unwatch 'onattributechanged' event from default adapter since adapter is
     * removed.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object} BluetoothAdapter adapter
     */
    _unwatchDefaultAdapterOnattributechanged:
    function btc__unwatchDefaultAdapterOnattributechanged(adapter) {
      adapter.removeEventListener('attributechanged',
        this._onAdapterAttributeChanged);
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
     * @param {Object} BluetoothAdapter adapter
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
     * @param {Object} BluetoothAdapter adapter
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
     * @param {Object} BluetoothAdapter adapter
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
     * @param {Object} BluetoothAdapter adapter
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
     * @param {Object} BluetoothAdapter adapter
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
              // Init paired device information while Bluetooth is enabled.
              this._refreshPairedDevicesInfo(adapter);
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
     * @param {Object} BluetoothAdapter adapter
     * @param {event} evt
     */
    _onAdapterDevicepaired:
    function btc__onAdapterDevicepaired(adapter, evt) {
      Debug('_onAdapterDevicepaired evt = ' + evt);
      // have to get device object in this event handler
      // Ex. evt.device --> device

      // Remove the paired device from remote devices list.
      this._removeItemFromList(this._remoteDevices, evt.device.address);

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
     * @param {Object} BluetoothAdapter adapter
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
     * @param {Object} BluetoothAdapter newAdapter
     * @param {Object} BluetoothAdapter oldAdapter
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
        // init paired device information while Bluetooth is enabled
        if (newAdapter.state === 'enabled') {
          this._refreshPairedDevicesInfo(newAdapter);
        }
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
     * @param {Object} BluetoothAdapter adapter
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
        // sort paired devices
        pairedDevices.sort(function(a, b) {
          return a.name > b.name;
        });
        // save paired devices in list
        for (var i in pairedDevices) {
          // create observable BtDevice
          var observableBtDevice = BtDevice(pairedDevices[i]);
          // push device in devices list with observable object
          this._pairedDevices.push(observableBtDevice);
        }
        // set the name
        this.firstPairedDeviceName = this._pairedDevices.get(0).name;
        // update property 'hasPairedDevice'
        this.hasPairedDevice = true;
        // Update connection status and profile for these paired devices.
        this._initConnectingDevices();
        this._initConnectedDevices();
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

      // Update state
      this.state = state;
      Debug('_updateStatus(): set state = ' + state);

      // Update enabled
      this.enabled = enabled;
      Debug('_updateStatus(): set enabled = ' + enabled);

      // Sync with settings key
      this._syncWithSettingsKey(enabled);
    },

    /**
     * The function provides to set booleans to update the 'bluetooth.enabled'
     * settings key if the value is not sync.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Boolean} enabled
     */
    _syncWithSettingsKey: function btc__syncWithSettingsKey(enabled) {
      var req = settings.createLock().get('bluetooth.enabled');
      req.onsuccess = function bt_onGetBTEnabledSuccess() {
        if (req.result) {
          var btEnabled = req.result['bluetooth.enabled'];
          if (btEnabled !== enabled) {
            settings.createLock().set({'bluetooth.enabled': enabled});
          }
        }
      };
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
      if (this.discovering === false) {
        Debug('stopDiscovery(): stopDiscovery successfully in same state :)');
        return Promise.resolve('same state');
      }

      if (this.state !== 'enabled') {
        return Promise.reject('Bluetooth is disabled!!');
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
     * @param {Object} BluetoothDiscoveryHandle handle
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
     * @param {Object} Observable device
     */
    _saveDevice: function btc__saveDevice(device) {
      // Find the device is existed in devices list or not.
      var existedDevice =
        this._findDeviceByAddress({
          paired: device.paired,
          address: device.address
        });
      // If the device is not existed yet, create observable object
      // for saving this device.
      if (!existedDevice) {
        // create observable BtDevice
        var observableBtDevice = BtDevice(device);
        // push device in devices list with observable object
        var operatingDevices =
          (device.paired) ? this.getPairedDevices() : this.getRemoteDevices();
        operatingDevices.push(observableBtDevice);
      } else {
        // The device is existed, no need to do any thing here.
        // set device in devices list
        // operatingDevices.set(index, device);
      }
    },

    /**
     * Given an observable arrry and item address. The function will remove it,
     * if it's existed in the array.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Observable array} list
     * @param {String} address
     */
    _removeItemFromList: function btc__removeItemFromList(list, address) {
      // check the device is existed or not in remote/paired devices array
      var index =
        list.array.findIndex(this._matchDeviceByAddress.bind(this, address));
      if (index > -1) {
        // The device is existed, remove it from observable list.
        list.splice(index, 1);
        Debug('_removeItemFromList(): index = ' + index);
      } else {
        // The device is not existed, no need to do any thing here.
      }
    },

    /**
     * Given paired, address properties to find out device element
     * from remote/paired devices list.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object} options
     * @param {String} options.paired - is paired or not
     * @param {String} options.address - the address of the device
     * @return {Object} device
     */
    _findDeviceByAddress:
    function btc__findDeviceByAddress(options) {
      // Distinguish to find the specific device in remote/paired devices list.
      var operatingDevices =
        (options.paired) ? this.getPairedDevices() : this.getRemoteDevices();
      // Check the device is existed or not in remote/paired devices array.
      var index = operatingDevices.array.findIndex(
        this._matchDeviceByAddress.bind(this, options.address));

      if (index > -1) {
        return operatingDevices.get(index);
      } else {
        return null;
      }
    },

    /**
     * Given address to find out device element from array.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {String} address
     * @param {BluetoothDevice} btDevice
     * @return {Boolean}
     */
    _matchDeviceByAddress:
    function btc__matchDeviceByAddress(address, btDevice) {
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

      // Note on Bluedroid stack, discovery has to be stopped before pairing
      // (i.e., call stopDiscovery() before pair()) otherwise stack callbacks
      // with pairing failure.
      return this.stopDiscovery().then(() => {
        return this._defaultAdapter.pair(address).then(() => {
          Debug('pair(): Resolved with void value');
        }, (reason) => {
          Debug('pair(): Reject with this reason: ' + reason);
          return Promise.reject(reason);
        });
      }, (reason) => {
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
    },

    /**
     * The method starts sending file to a remote device with the device's
     * adapter.
     *
     * @access public
     * @memberOf BluetoothContext
     * @param {String} address - address of target device
     * @param {Object} blob - blob(file) to send
     * @returns {Promise}
     */
    sendFile: function btc_sendFile(address, blob) {
      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }

      return this._defaultAdapter.sendFile(address, blob).then(() => {
        Debug('sendFile(): Resolved with void value');
      }, (reason) => {
        Debug('sendFile(): Reject with this reason: ' + reason);
        return Promise.reject(reason);
      });
    },

    /**
     * Init the connecting device which is browsed in paired devices list.
     * Get connection info from ConnectionManager.
     *
     * @access private
     * @memberOf BluetoothContext
     */
    _initConnectingDevices: function btc__initConnectingDevices() {
      // Init the paired device connection status for connecting device.
      if (!ConnectionManager.connectingAddress) {
        return;
      }

      var existedDevice =
        this._findDeviceByAddress({
          paired: true,
          address: ConnectionManager.connectingAddress
        });
      if (existedDevice) {
        // The connecting device is existed. Init connection status for it.
        var options = {
          connectionStatus: 'connecting'
        };
        Debug('_initConnectingDevices(): options = ' + JSON.stringify(options));
        existedDevice.updateConnectionInfo(options);
      }
    },

    /**
     * Init the connected device which is browsed in paired devices list.
     * Get connection info from ConnectionManager.
     *
     * @access private
     * @memberOf BluetoothContext
     */
    _initConnectedDevices: function btc__initConnectedDevices() {
      // Init the connection status of paired device for connected device.
      ConnectionManager.getConnectedDevices().then((connectedDevices) => {
        for (var address in connectedDevices) {
          var existedDevice =
            this._findDeviceByAddress({paired: true, address: address});

          if (existedDevice) {
            // The connected device is existed.
            // Init connection status/profiles for it.
            var options = {
              connectionStatus: 'connected',
              profiles: connectedDevices[address].connectedProfiles
            };
            Debug('_initConnectedDevices(): address = ' + address +
                  ', options = ' + JSON.stringify(options));
            existedDevice.updateConnectionInfo(options);
          }
        }
      }, (reason) => {
        Debug('_initConnectedDevices(): getConnectedDevices(): failed, ' +
              'reason = ' + reason);
      });
    },

    /**
     * Device 'connecting', 'connected', 'disconnected', and 'profiles'
     * properties are changed from ConnectionManager operation.
     * Update device properties of connection info via event 'type', 'detail'.
     *
     * @access private
     * @memberOf BluetoothContext
     * @param {Object} event
     * @param {String} event.type - type of event name
     * @param {Object} event.detail - device info in this object
     * @param {Object} event.detail.address - address of device
     * @param {Object} event.detail.profiles - connection profiles of device
     */
    _updateDeviceConnectionInfo:
    function btc__updateDeviceConnectionInfo(event) {
      Debug('_updateDeviceConnectionInfo(): event = ' + JSON.stringify(event));
      var existedDevice =
        this._findDeviceByAddress(
          {paired: true, address: event.detail.address});
      if (existedDevice) {
        // The device is existed, update device info by event type.
        var options;
        switch (event.type) {
          case 'connecting':
          case 'connected':
          case 'disconnected':
            options = {
              connectionStatus: event.type
            };
            break;
          case 'profileChanged':
            options = {
              profiles: event.detail.profiles
            };
            break;
          default:
            break;
        }
        Debug('_updateDeviceConnectionInfo(): options = ' +
              JSON.stringify(options));
        existedDevice.updateConnectionInfo(options);
      } else {
        // If the device is not existed yet, do nothing here.
      }
    }
  };

  // Create the observable object using the prototype.
  var bluetoothContext = Observable(BluetoothContext);
  bluetoothContext._init();
  return bluetoothContext;
});
