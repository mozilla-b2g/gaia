/* globals evt, BluetoothLoader */
(function(exports) {
  'use strict';

  var BluetoothManager = function() {};

  BluetoothManager.prototype = evt({
    _mozBluetooth: undefined,

    _defaultAdapter: undefined,

    _discoveryHandle: undefined,

    _handleDeviceFound: undefined,

    _handleBeforeUnload: undefined,

    _deviceDeck: undefined,

    init: function bm_init() {
      this._mozBluetooth = BluetoothLoader.getMozBluetooth();

      this._handleDeviceFound = this.onDeviceFound.bind(this);

      this._mozBluetooth.addEventListener('attributechanged',
        this.onAttributeChanged.bind(this));

      this._defaultAdapter = this._mozBluetooth.defaultAdapter;
    },

    onAttributeChanged: function bm_onAttributeChanged(evt) {
      var that = this;
      [].forEach.call(evt.attrs, function(attr, index) {
        if (attr === 'defaultAdapter') {
          that._defaultAdapter = that._mozBluetooth.defaultAdapter;
          that.fire('default-adapter-ready');
        }
      });
    },

    _keepDiscoveryHandle: function bm_keepDiscoveryHandle(handle) {
      this._discoveryHandle = handle;
      this._discoveryHandle.addEventListener('devicefound',
        this._handleDeviceFound);
    },

    _startDiscovery: function bm_startDiscovery() {
      var that = this;
      if (!this._defaultAdapter) {
        return Promise.reject('default adapter doesn\'t exist');
      }

      if (this._defaultAdapter.state !== 'enabled') {
        return this._defaultAdapter.enable().then(function() {
          return that._defaultAdapter.startDiscovery();
        }).then(this._keepDiscoveryHandle.bind(this));
      }

      return this._defaultAdapter.startDiscovery().then(
        this._keepDiscoveryHandle.bind(this));
    },

    _stopDiscovery: function bm_stopDiscovery() {
      if (!this._defaultAdapter) {
        return Promise.reject('default adapter doesn\'t exist');
      }

      // force to stop anyway
      return this._defaultAdapter.stopDiscovery();
    },

    safelyStartDiscovery: function bm_safelyStartDiscovery() {
      var that = this;
      if (!this._defaultAdapter) {
        return new Promise(function(resolve, reject) {
          that.on('default-adapter-ready', function() {
            resolve(that._startDiscovery());
          });
        });
      }
      return this._startDiscovery();
    },

    safelyStopDiscovery: function bn_safelyStopDiscovery() {
      return this._stopDiscovery().catch(function(reason) {
        console.warn('failed to stop discovery: ' + reason);
      });
    },

    onDeviceFound: function bm_onDeviceFound(evt) {
      var device = evt.device;
      this.fire('device-found', device);
    }
  });

  exports.BluetoothManager = BluetoothManager;
}(window));
