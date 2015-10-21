/* global SpatialNavigator, SharedUtils, KeyNavigationAdapter,
          BluetoothManager, evt, BluetoothCodMapper */

(function(exports) {
  'use strict';

  /**
   * DeviceDeck is the controller class of device-deck.
   *
   * @class DeviceDeck
   * @requires  BluetoothManager
   * @requires  KeyNavigationAdapter
   * @requires  SpatialNavigator
   * @requires  {@link http://bit.ly/1Ld0WYX|SmartButton}
   */
  var DeviceDeck = function() {
  };

  DeviceDeck.prototype = evt({
    _navigableElements: [],

    _spatialNavigator: undefined,

    _keyNavigationAdapter: undefined,

    connectedDevicesList:
      document.getElementById('connected-devices-list'),

    newlyFoundDeviceList:
      document.getElementById('newly-found-devices-list'),

    _bluetoothManager: undefined,

    /**
     * Initialize DeviceDeck. It means:
     * 1. initialize BlutoothManager and start discovery immediately
     * 2. initialize KeyNavigationAdapter
     * 3. Find all navigable elements and initialize SpatialNavigator
     *
     * And when it receives `device-found` event from BluetoothManager, it will
     * create {@link http://bit.ly/1Ld0WYX|SmartButton} for the device.
     *
     * @public
     * @method  DeviceDeck#init
     */
    init: function() {
      this._bluetoothManager = new BluetoothManager();
      this._bluetoothManager.init();
      this._bluetoothManager.safelyStartDiscovery();

      this._bluetoothManager.on('device-found',
        this.onBluetoothDeviceFound.bind(this));

      this._keyNavigationAdapter = new KeyNavigationAdapter();
      this._keyNavigationAdapter.init();

      this._navigableElements =
        SharedUtils.nodeListToArray(
          document.querySelectorAll('.navigable:not(.app-banner)'));

      this._spatialNavigator = new SpatialNavigator(this._navigableElements);
      this._spatialNavigator.on('focus', this.onFocus.bind(this));

      this._keyNavigationAdapter.on('move', this.onMove.bind(this));
      this._keyNavigationAdapter.on('enter-keyup', this.onEnter.bind(this));

      this._spatialNavigator.focus();
    },

    /**
     * refresh list of devices in div#connected-devices-list and
     * div#newly-found-devices-list
     *
     * @public
     * @method DeviceDeck#refreshDevices
     */
    refreshDevices: function() {
      var that = this;
      this._bluetoothManager.safelyStopDiscovery().then(function() {
        [].forEach.call(that.connectedDevicesList.children, function(elem) {
          elem.remove();
        });
        [].forEach.call(that.newlyFoundDeviceList.children, function(elem) {
          elem.remove();
        });
      }).then(function() {
        that._bluetoothManager.safelyStartDiscovery();
      });
    },

    /**
     * Create {@link http://bit.ly/1Ld0WYX|SmartButton} for each device found
     * and append it to div#connected-devices-list or
     * div#newly-found-devices-list
     *
     * @public
     * @method DeviceDeck#onBluetoothDeviceFound
     * @param {BluetoothDevice} device - see
     *                             {@link http://mzl.la/1UQllr3|BluetoothDevice}
     */
    onBluetoothDeviceFound: function(device) {
      var name = device.name || device.address;
      var paired = device.paired;

      // TODO: we should validate whether there is duplicate button of device
      var button = document.createElement('smart-button');
      button.setAttribute('type', 'app-button');
      button.setAttribute('app-type', 'device');
      button.classList.add('navigable');
      button.setAttribute('label', name);
      button.dataset.type = 'bluetooth';
      button.dataset.address = device.address;
      button.dataset.icon = BluetoothCodMapper.getIconName(device.cod);
      button.dataset.bluetoothDeviceType = device.type;

      if (paired) {
        this.connectedDevicesList.appendChild(button);
      } else {
        this.newlyFoundDeviceList.appendChild(button);
      }
      this._spatialNavigator.add(button);
    },

    onMove: function(key) {
      this._spatialNavigator.move(key);
    },

    onEnter: function() {
      var focused = this._spatialNavigator.getFocusedElement();
      if (focused && focused.id === 'refresh-button') {
        this.refreshDevices();
      }
    },

    onFocus: function(elem) {
      elem.focus();
    }
  });

  exports.deviceDeck = new DeviceDeck();
  exports.deviceDeck.init();

} (window));
