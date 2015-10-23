/**
 * BluetoothConnectionManager:
 * BluetoothConnectionManager only update state and does not involve in any UI
 *   logic.
 *
 * @module BluetoothConnectionManager
 */
define(function(require) {
  'use strict';

  var AdapterManager = require('modules/bluetooth/bluetooth_adapter_manager');
  var AsyncStorage = require('shared/async_storage');

  var _debug = false;
  var debug = function() {};
  if (_debug) {
    debug = function btam_debug(msg) {
      console.log('--> [BluetoothConnectionManager]: ' + msg);
    };
  }

  /**
   * @alias module:modules/bluetooth/BluetoothConnectionManager
   * @requires module:modules/bluetooth/bluetooth_adapter_manager
   * @requires module:shared/async_storage
   * @return {BluetoothConnectionManager}
   */
  var BluetoothConnectionManager = {
    /**
     * The profiles of connected device that we are defined here.
     *
     * @public
     * @memberOf BluetoothConnectionManager
     * @type {Object}
     */
    Profiles: {
      'hfp': 0x111E,  // Handsfree
      'a2dp': 0x110D  // Advanced Audio Distribution Devices
    },

    /**
     * The address of device that we are trying to connect.
     *
     * @public
     * @memberOf BluetoothConnectionManager
     * @type {String}
     */
    connectingAddress: null,

    /**
     * A object that we cache the connected devices information(address, device,
     * connectedProfiles). It will be inited while default adapter is ready.
     * And these information is coming from profile events.
     * Each connected device is hashed by device address.
     *
     * EX:
     * _connectedDevicesInfo = {
     *   'AA:BB:CC:00:11:22': {
     *     'device': DeviceObject,
     *     'connectedProfiles': {
     *       'hfp': true,
     *       'a2dp': false
     *     }
     *   }
     * };
     *
     * @private
     * @memberOf BluetoothConnectionManager
     * @type {Object}
     */
    _connectedDevicesInfo: {},

    /**
     * An instance to maintain that we have created a promise to get connected
     * devices.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @return {Promise}
     */
     _getConnectedDevicesPromise: null,

    /**
     * The object maintains listeners' callback per property name.
     * Each listener would be called as following definition.
     * 'connecting' - be called when device is connecting.
     * 'connected': - be called when device is connected.
     * 'disconnected': - be called when device is disconnected.
     * 'profileChanged': - be called when profile is changed.
     *
     * @memberOf BluetoothConnectionManager
     * @type {Object}
     */
    _listeners: {
      'connecting': [],
      'connected': [],
      'disconnected': [],
      'profileChanged': []
    },

    /**
     * Default adapter of Bluetooth.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @type {BluetoothAdapter}
     */
    _defaultAdapter: null,

    /**
     * Init BluetoothConnectionManager module.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     */
    _init: function btcm__init() {
      // Observe 'defaultAdapter' property for reaching default adapter.
      AdapterManager.observe('defaultAdapter',
                             this._onDefaultAdapterChanged.bind(this));
      this._onDefaultAdapterChanged(AdapterManager.defaultAdapter);
    },

    /**
     * 'defaultAdapter' change event handler from adapter manager for
     * updating adapter immediately.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothAdapter} newAdapter
     * @param {BluetoothAdapter} oldAdapter
     */
    _onDefaultAdapterChanged:
    function btcm__onDefaultAdapterChanged(newAdapter, oldAdapter) {
      debug('_onDefaultAdapterChanged(): newAdapter = ' + newAdapter);
      debug('_onDefaultAdapterChanged(): oldAdapter = ' + oldAdapter);

      // save default adapter
      this._defaultAdapter = newAdapter;

      if (oldAdapter) {
        // unwatch event since the old adapter is no longer usefull
        this._unwatchProfilesStatuschanged(oldAdapter);
        this._unwatchDefaultAdapterOnattributechanged(oldAdapter);
      }

      if (newAdapter) {
        // watch event since the new adapter is ready to access
        this._watchProfilesStatuschanged(newAdapter);
        this._watchDefaultAdapterOnattributechanged(newAdapter);
        // restore connection
        if (newAdapter.state === 'enabled') {
          this._restoreConnection();
        }
      } else {
        // reset properties only
        this._resetConnectionInfo();
      }
    },

    /**
     * Return the cache of connected devices in ConnectionManager.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @return {Promise}
     */
    getConnectedDevices: function btcm_getConnectedDevices() {
      if (!this._getConnectedDevicesPromise) {
        this._getConnectedDevicesPromise =
          this._initConnectedDevicesInfo().then(() => {
            debug('getConnectedDevices(): resolved with latest cache = ' +
                  JSON.stringify(this._connectedDevicesInfo));
            return this._connectedDevicesInfo;
        }, (reason) => {
          debug('getConnectedDevices(): rejected with reason = ' + reason);
          this._getConnectedDevicesPromise = null;
        });
      }
      return this._getConnectedDevicesPromise;
    },

    /**
     * Init cache of connected device and save it in cache.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @return {Promise}
     */
    _initConnectedDevicesInfo: function btcm__initConnectedDevicesInfo() {
      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }
      // Init connection status and profile from platform.
      // Then, save these connected device information in cache.
      return this._getConnectedDevicesFromPlatform().then(
      (connectedDevicesByProfile) => {
        this._constructDeviceItemsMap(connectedDevicesByProfile);
      }, (reason) => {
        debug('_initConnectedDevicesInfo(): rejected in ' +
              '_getConnectedDevicesFromPlatform');
        return Promise.reject(reason);
      });
    },

    /**
     * The method will update each device item in maintaining map.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {Object} connectedDevices
     */
    _constructDeviceItemsMap:
    function btcm__constructDeviceItemsMap(connectedDevices) {
      debug('_constructDeviceItemsMap(): connectedDevices = ' +
            JSON.stringify(connectedDevices));
      if (!connectedDevices) {
        // Return empty object while there is no any connected devices.
        debug('_constructDeviceItemsMap(): early return with empty object');
        return;
      }

      Object.keys(this.Profiles).map((profileID) => {
        connectedDevices[profileID].forEach((connectedDevice) => {
          var connectionDeviceInfo = {
            address: connectedDevice.address,
            connected: true,
            profileID: profileID,
            device: connectedDevice
          };
          debug('_constructDeviceItemsMap(): connectionDeviceInfo = ' +
                JSON.stringify(connectionDeviceInfo));
          this._initConnectedDevicesCache(connectionDeviceInfo);
        });
      });
    },

    /**
     * Init the cache which is maintained for connection devices.
     * And the input is gotten from platform API adapter.getConnectedDevices().
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {Object} options
     * @param {String} options.address - address of the device
     * @param {Boolean} options.connected - is connected or not
     * @param {Object} options.profileID - profile ID of the connection type
     * @param {Object} options.device - connect device, Bluetooth Object
     */
    _initConnectedDevicesCache:
    function btcm__initConnectedDevicesCache(options) {
      debug('_initConnectedDevicesCache(): options = ' +
            JSON.stringify(options));
      // hash by device address
      var info = this._connectedDevicesInfo[options.address];
      if (info) {
        // Already have profiles, update it for other profile.
        info.connectedProfiles[options.profileID] = options.connected;
      } else {
        // Not have profiles yet, create for it.
        // If options.device is existed, save the connected device.
        // Otherwise, given null in this property.
        var connectedDevice = (options.device) ? options.device : null;
        info = {
          'device': connectedDevice,
          'connectedProfiles': {}
        };
        info.connectedProfiles[options.profileID] = options.connected;
      }
      // Save the device/profile in map.
      this._connectedDevicesInfo[options.address] = info;

      // If there is no profile connected,
      // remove the device item from cache since it is already disconnected.
      var dataToCheckConnectedProfile = {
        address: options.address,
        connectedDevices: this._connectedDevicesInfo
      };
      if (!this._hasConnectedProfileByAddress(dataToCheckConnectedProfile)) {
        delete this._connectedDevicesInfo[options.address];
      }
      // Return the latest cache which is just updated here.
      debug('_initConnectedDevicesCache(): this._connectedDevicesInfo = ' +
            JSON.stringify(this._connectedDevicesInfo));
      return this._connectedDevicesInfo;
    },

    /**
     * Update the cache which is maintained for connection devices.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {Object} options
     * @param {String} options.address - address of the device
     * @param {Boolean} options.connected - is connected or not
     * @param {Object} options.profileID - profile ID of the connection type
     * @param {Object} options.device - connect device, Bluetooth Object
     */
    _updateConnectedDevices:
    function btcm__updateConnectedDevices(options) {
      return this.getConnectedDevices().then((connectedDevicesInfo) => {
        debug('_updateConnectedDevices(): connectedDevicesInfo = ' +
              JSON.stringify(connectedDevicesInfo));

        // hash by device address
        var info =
          (connectedDevicesInfo) ? connectedDevicesInfo[options.address] : null;
        if (info) {
          // Already have profiles, update it for other profile.
          info.connectedProfiles[options.profileID] = options.connected;
        } else {
          // Not have profiles yet, create for it.
          // If options.device is existed, save the connected device.
          // Otherwise, given null in this property.
          var connectedDevice = (options.device) ? options.device : null;
          info = {
            'device': connectedDevice,
            'connectedProfiles': {}
          };
          info.connectedProfiles[options.profileID] = options.connected;
        }
        // Save the device/profile in map.
        this._connectedDevicesInfo[options.address] = info;

        // If there is no profile connected,
        // remove the device item from cache since it is already disconnected.
        var dataToCheckConnectedProfile = {
          address: options.address,
          connectedDevices: this._connectedDevicesInfo
        };
        if (!this._hasConnectedProfileByAddress(dataToCheckConnectedProfile)) {
          delete this._connectedDevicesInfo[options.address];
        }
        // Return the latest cache which is just updated here.
        debug('_updateConnectedDevices(): this._connectedDevicesInfo = ' +
              JSON.stringify(this._connectedDevicesInfo));
        return Promise.resolve(this._connectedDevicesInfo);
      }, () => {
        debug('_updateConnectedDevices(): rejected with some exception');
        return Promise.reject('rejected with some exception');
      });
    },

    /**
     * Only reset properties since there is no available default adapter.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     */
    _resetConnectionInfo: function btcm__resetConnectionInfo() {
      // Reset connection status.
      this.connectingAddress = null;
      // Clean up the instance to get connected devices
      // while new adapter is ready.
      this._getConnectedDevicesPromise = null;
    },

    /**
     * Watch 'onattributechanged' event from default adapter for watching
     * adapter enabled/disabled status.
     *
     * Description of 'onattributechanged' event:
     * A handler to trigger when one of the local bluetooth adapter's properties
     * has changed. Note access to the changed property in this event handler
     * would get the updated value.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothAdapter} adapter
     */
    _watchDefaultAdapterOnattributechanged:
    function btcm__watchDefaultAdapterOnattributechanged(adapter) {
      adapter.addEventListener('attributechanged',
        this._onAdapterAttributeChanged.bind(this, adapter));
    },

    /**
     * Unwatch 'onattributechanged' event from default adapter since adapter is
     * removed.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothAdapter} adapter
     */
    _unwatchDefaultAdapterOnattributechanged:
    function btcm__unwatchDefaultAdapterOnattributechanged(adapter) {
      adapter.removeEventListener('attributechanged',
        this._onAdapterAttributeChanged);
    },

    /**
     * 'onattributechanged' event handler from default adapter for reaching
     * adapter enabled/disabled status.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothAdapter} adapter
     * @param {event} evt
     */
    _onAdapterAttributeChanged:
    function btcm__onAdapterAttributeChanged(adapter, evt) {
      for (var i in evt.attrs) {
        debug('_onAdapterAttributeChanged(): ' + evt.attrs[i]);
        switch (evt.attrs[i]) {
          case 'state':
            if (adapter.state === 'enabled') {
              // Restore connection while default adapter state is enabled.
              this._restoreConnection();
            }
            break;
          default:
            break;
        }
      }
    },

    /**
     * Watch every of profile events('onhfpstatuschanged','ona2dpstatuschanged')
     * from default adapter for updating device connected status immediately.
     *
     * Description of 'onhfpstatuschanged' event:
     * Specifies an event listener to receive hfpstatuschanged events.
     * Those events occur when an HFP connection status changes.
     *
     * Description of 'ona2dpstatuschanged' event:
     * Specifies an event listener to receive a2dpstatuschanged events.
     * Those events occur when an A2DP connection status changes.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothAdapter} adapter
     */
    _watchProfilesStatuschanged:
    function btcm__watchProfilesStatuschanged(adapter) {
      var eventName;
      for (var profileID in this.Profiles) {
        eventName = 'on' + profileID + 'statuschanged';
        adapter[eventName] =
          this._onProfileStatuschangeHandler.bind(this, profileID);
      }
    },

    /**
     * Unwatch every of profile events('onhfpstatuschanged',
     * 'ona2dpstatuschanged') from default adapter since adapter is removed.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothAdapter} adapter
     */
    _unwatchProfilesStatuschanged:
    function btc__unwatchProfilesStatuschanged(adapter) {
      var eventName;
      for (var profileID in this.Profiles) {
        eventName = 'on' + profileID + 'statuschanged';
        adapter[eventName] = null;
      }
    },

    /**
     * 'onhfpstatuschanged', 'ona2dpstatuschanged' events handler from
     * default adapter for updating device connected status.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {String} profileID
     * @param {event} evt
     */
    _onProfileStatuschangeHandler:
    function btcm__onProfileStatuschangeHandler(profileID, evt) {
      debug('_onProfileStatuschangeHandler(): profileID = ' + profileID +
            ', evt.address = ' + evt.address + ', evt.status = ' + evt.status);
      var options = {
        address: evt.address,
        connected: evt.status,
        profileID: profileID
      };
      // Update connection status.
      this._updateConnectionStatus(options);
    },

    /**
     * Query async storage to restore connection.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     */
    _restoreConnection: function btcm__restoreConnection() {
      if (!this._defaultAdapter) {
        return;
      }

      // Reconnect the one kept in the async storage.
      AsyncStorage.getItem('device.connected', (address) => {
        if (!address) {
          return;
        }

        // Make sure the restore device is already connected or not.
        this.getConnectedDevices().then((connectedDevices) => {
          if (connectedDevices && connectedDevices[address]) {
            // Do an early return since the restore device is connected already.
            debug('_restoreConnection(): early return cause connected already');
            return;
          }

          // Get the device which is wanted to connect from paired devices.
          var restoreDevice = this._getPairedDeviceByAddress(address);
          if (restoreDevice) {
            this.connectingAddress = restoreDevice.address;
            // Fire 'connecting' event.
            var event = {
              type: 'connecting',
              detail: {
                address: restoreDevice.address
              }
            };
            this._emitEvent(event);
            this._connect(restoreDevice).then(() => {
              debug('_restoreConnection(): restore connection successfully');
            }, (reason) => {
              debug('_restoreConnection(): restore connection failed, ' +
                    'reason = ' + reason);
              // No available profiles are connected. Reset connecting address.
              this.connectingAddress = null;
              // Then, fire 'disconnected' event.
              event = {
                type: 'disconnected',
                detail: {
                  address: restoreDevice.address
                }
              };
              this._emitEvent(event);
            });
          }
        });
      });
    },

    /**
     * Record connected device so if Bluetooth is turned off and then on
     * we can restore the connection.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {String} action - to set or remove item for recording connection
     * @param {String} address - the address of connected device
     */
    _recordConnection: function btcm__recordConnection(action, address) {
      if (action === 'set') {
        // record connected device so if Bluetooth is turned off and then on
        // we can restore the connection
        AsyncStorage.setItem('device.connected', address);
        debug('_recordConnection(): set item');
      } else if ((action === 'remove') &&
                 (this._defaultAdapter.state === 'enabled')) {
        // Clean up the connected device from async storage
        // which is recorded before.
        // Only remove the record while Bluetooth state is enabled.
        // Because the request also comes while Bluetooth is turned off.
        AsyncStorage.removeItem('device.connected');
        debug('_recordConnection(): remove item');
      }
    },

    /**
     * Update connection status.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {Object} options
     * @param {String} options.address - address of the device
     * @param {Boolean} options.connected - is connected or not
     * @param {Object} options.profileID - profile ID of the connection type
     */
    _updateConnectionStatus: function btcm___updateConnectionStatus(options) {
      debug('_updateConnectionStatus(): address = ' + options.address +
                                       ', connected = ' + options.connected +
                                       ', profileID = ' + options.profileID);
      this.connectingAddress = null;

      // Update the profile in the cache of connected device info.
      this._updateConnectedDevices(options).then((connectedDevicesInfo) => {
        debug('_updateConnectionStatus(): _updateConnectedDevices() ' +
              'resolved with connectedDevicesInfo = ' +
              JSON.stringify(connectedDevicesInfo));
        // Prepare latest data to check connected profile.
        var dataToCheckConnectedProfile = {
          address: options.address,
          connectedDevices: connectedDevicesInfo
        };
        // Fire 'connected'/'disconnected' event according to
        // the connection profile. Then, record connection.
        var event;
        if (options.connected) {
          // Fire 'connected' event.
          event = {
            type: 'connected',
            detail: {
              address: options.address
            }
          };
          this._emitEvent(event);
          // Record connection.
          this._recordConnection('set', options.address);
        } else {
          // If there is no profile connected,
          // we have to remove the record connection.
          // And fire 'disconnected' event for outer modules.
          if (!this._hasConnectedProfileByAddress(
              dataToCheckConnectedProfile)) {
            // Record connection. Only remove the record while Bluetooth state
            // is enabled. Because the event also comes while Bluetooth is
            // turned off.
            if (this._defaultAdapter.state === 'enabled') {
              this._recordConnection('remove');
            }
            // Fire 'disconnected' event.
            event = {
              type: 'disconnected',
              detail: {
                address: options.address
              }
            };
            this._emitEvent(event);
          }
        }

        // Fire 'profileChanged' event.
        var newProfiles;
        if (!this._hasConnectedProfileByAddress(dataToCheckConnectedProfile)) {
          newProfiles = null;
        } else {
          newProfiles = connectedDevicesInfo[options.address].connectedProfiles;
        }
        event = {
          type: 'profileChanged',
          detail: {
            address: options.address,
            profiles: newProfiles
          }
        };
        this._emitEvent(event);
      }, (reason) => {
        debug('_updateConnectionStatus(): miss to update in rejected case, ' +
              'reason = ' + reason);
      });
    },

    /**
     * It provides a convenient function for panel to connect with a device.
     * And the panel no need to care about connected device currently.
     * The method will disconnect current connected device first.
     * Then, it will start connecting a paired device with the device's adapter.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothDevice} device
     * @return {Promise}
     */
    connect: function btcm_connect(device) {
      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }

      // Disconnect current connected device first.
      debug('connect(): Want to connect device address = ' + device.address +
            ', name = ' + device.name);

      var connectedDevices = [];
      return this.getConnectedDevices().then((connectedDevicesInfo) => {
        for (var address in connectedDevicesInfo) {
          if (connectedDevicesInfo[address].device !== null) {
            connectedDevices.push(connectedDevicesInfo[address].device);
            debug('connect(): push device cache in queue = ' +
                  JSON.stringify(connectedDevices));
          } else {
            var regetPairedDevice = this._getPairedDeviceByAddress(address);
            connectedDevices.push(regetPairedDevice);
            debug('connect(): push _getPairedDeviceByAddress in queue = ' +
                  JSON.stringify(regetPairedDevice));
          }
        }

        debug('connect(): Will disconnect these connected devices = ' +
              JSON.stringify(connectedDevices));

        // Disconnect these connected device before
        // service to connect with new device.
        return Promise.all(connectedDevices.map((connectedDevice) => {
          return this.disconnect(connectedDevice);
        })).then(() => {
          // All connected devices is disconnected.
          // We can start to connect the new request.
          debug('connect(): Start to connect with wanted device address = ' +
                device.address);
          return this._connect(device).then(() => {
            debug('connect(): Resolved');
          }, (reason) => {
            debug('connect(): reason = ' + reason);
            return Promise.reject(reason);
          });
        });
      });
    },

    /**
     * The method will connect the input device with the device's adapter.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothDevice} device
     * @returns {Promise}
     */
    _connect: function btcm__connect(device) {
      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }

      // Save the connecting address
      this.connectingAddress = device.address;
      // Fire 'connecting' event.
      var event = {
        type: 'connecting',
        detail: {
          address: device.address
        }
      };
      this._emitEvent(event);
      debug('_connect(): before start to connect, stop discovery first');

      // Note on Bluedroid stack, discovery has to be stopped before connect
      // (i.e., call stopDiscovery() before connect())
      // otherwise stack callbacks with connect failure.
      return this._defaultAdapter.stopDiscovery().then(() => {
        debug('_connect(): start connecting device, ' +
              'address = ' + device.address);
        return this._defaultAdapter.connect(device).then(() => {
          debug('_connect(): resolve, already connected with address = ' +
                device.address);
        }, () => {
          // No available profiles are connected. Reset connecting address.
          this.connectingAddress = null;
          // Fire 'disconnected' event.
          event = {
            type: 'disconnected',
            detail: {
              address: device.address
            }
          };
          this._emitEvent(event);
          debug('_connect(): reject with connection failed');
          return Promise.reject('connection failed');
        });
      }, () => {
        // Cannot connect with the device since stopDiscovery failed.
        this.connectingAddress = null;
        // Fire 'disconnected' event.
        event = {
          type: 'disconnected',
          detail: {
            address: device.address
          }
        };
        this._emitEvent(event);
        debug('_connect(): reject with stop discovery failed');
        return Promise.reject('stop discovery failed');
      });
    },

    /**
     * The method will disconnect the input device with the device's adapter.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @param {BluetoothDevice} device
     * @returns {Promise}
     */
    disconnect: function btcm_disconnect(device) {
      if (!this._defaultAdapter) {
        return Promise.reject('default adapter is not existed!!');
      }

      return this._defaultAdapter.disconnect(device).then(() => {
        debug('disconnect(): onsuccess(): resolve');
      }, () => {
        debug('disconnect(): onerror(): reject with disconnect failed');
        return Promise.reject('disconnect failed');
      });
    },

    /**
     * The method will get all connected devices profiles
     * which we are interested in. Profile: HFP, A2DP.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @returns {Promise} resolve: connectedDevices
     * @returns {Promise} reject: reason
     */
    _getConnectedDevicesFromPlatform:
    function btcm__getConnectedDevicesFromPlatform() {
      // Get connected device via profiles HFP, A2DP
      return Promise.all(Object.keys(this.Profiles).map((profile) => {
        return this._getConnectedDevicesByProfile(this.Profiles[profile]);
      })).then((connectedDevices) => {
        // Update each connected devices in map.
        var collectedConnectedDevicesByProfile = {};
        Object.keys(this.Profiles).forEach((profile, index) => {
          collectedConnectedDevicesByProfile[profile] = connectedDevices[index];
        });
        debug('_getConnectedDevicesFromPlatform(): ' +
              'collectedConnectedDevicesByProfile = ' +
              JSON.stringify(collectedConnectedDevicesByProfile));
        return Promise.resolve(collectedConnectedDevicesByProfile);
      });
    },

    /**
     * The method will get connected device by inputed profile.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {String} profileID
     * @returns {Promise} resolve: the connected devices in array
     * @returns {Promise} reject: reason
     */
    _getConnectedDevicesByProfile:
    function btcm__getConnectedDevicesByProfile(profileID) {
      if (!this._defaultAdapter) {
        debug('_getConnectedDevicesByProfile(): reject with no adapter');
        return Promise.reject('default adapter is not existed!!');
      }

      if (this._defaultAdapter.state === 'disabled') {
        debug('_getConnectedDevicesByProfile(): resolve with empty array ' +
              'since it is impossible to connect with any device');
        return Promise.reject('getConnectedDevices in disabled state');
      }

      return this._defaultAdapter.getConnectedDevices(profileID).then(
      (connectedDevice) => {
        debug('_getConnectedDevicesByProfile(): resolved with ' +
              'connectedDevice = ' + JSON.stringify(connectedDevice));
        return Promise.resolve(connectedDevice || []);
      }, (reason) => {
        debug('_getConnectedDevicesByProfile(): rejected with ' +
              'reason = ' + reason);
        return Promise.reject(reason);
      });
    },

    /**
     * Get device from paired devices by address.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {String} address
     */
    _getPairedDeviceByAddress:
    function btcm__getPairedDeviceByAddress(address) {
      if (!this._defaultAdapter) {
        return null;
      }

      var pairedDevices = this._defaultAdapter.getPairedDevices();
      if (pairedDevices.length === 0) {
        return null;
      } else {
        for (var i in pairedDevices) {
          if (pairedDevices[i].address === address) {
            return pairedDevices[i];
          }
        }
        return null;
      }
    },

    /**
     * Find out there is any profile still connected.
     *
     * @access private
     * @memberOf BluetoothConnectionManager
     * @param {Object} options
     * @param {String} options.connectedDevices - connected devices info
     * @param {String} options.address - the address of device
     */
    _hasConnectedProfileByAddress:
    function btcm__hasConnectedProfileByAddress(options) {
      if (!options.connectedDevices[options.address]) {
        return false;
      }

      var hasConnectedProfile = false;
      for (var profileID in this.Profiles) {
        var connectedProfiles =
          options.connectedDevices[options.address].connectedProfiles;
        if (connectedProfiles && (connectedProfiles[profileID] === true)) {
          hasConnectedProfile = true;
        }
      }
      return hasConnectedProfile;
    },

    /**
     * A function to emit event to each registered listener by the input type.
     *
     * @memberOf BluetoothConnectionManager
     * @param {Object} options
     * @param {String} options.type - type of event name
     * @param {Object} options.detail - the object pass to the listener
     */
    _emitEvent: function btcm__emitEvent(options) {
      this._listeners[options.type].forEach(function(listener) {
        listener(options);
      });
    },

    /**
     * The method will provide event listener for outer modules to regist.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @param {String} eventName
     * @param {Function} callback
     */
    addEventListener: function btcm_addEventListener(eventName, callback) {
      if (callback && (this._listeners.hasOwnProperty(eventName))) {
        this._listeners[eventName].push(callback);
      }
    },

    /**
     * The method will provide event listener for outer modules to un-regist.
     *
     * @access public
     * @memberOf BluetoothConnectionManager
     * @param {String} eventName
     * @param {Function} callback
     */
    removeEventListener:
    function btcm_removeEventListener(eventName, callback) {
      if (callback && (this._listeners.hasOwnProperty(eventName))) {
        var index = this._listeners[eventName].indexOf(callback);
        if (index >= 0) {
          this._listeners[eventName].splice(index, 1);
        }
      }
    }
  };

  BluetoothConnectionManager._init();
  return BluetoothConnectionManager;
});
