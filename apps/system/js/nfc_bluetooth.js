/* globals BluetoothTransfer */
/* exported NfcBluetooth */
'use strict';
var NfcBluetooth = {
  /**
   * mozBluetooth object
   * @type {Object}
   * @memberof NfcBluetooth.prototype
   */
  bluetooth: null,

  /**
   * Default bluetooth adapter
   * @type {Object}
   * @memberof NfcBluetooth.prototype
   */
  defaultAdapter: null,

  /**
   * Keeps a list of actions that need to be performed after
   * Bluetooth is turned on.
   * @type {Array}
   * @memberof NfcHandoverManager.prototype
   */
  actionQueue: [],

  /**
   * Remembers whether Bluetooth was already saved during an earlier
   * file transfer.
   * @type {boolean}
   * @memberof NfcBluetooth.prototype
   */
  bluetoothStatusSaved: false,

  /**
   * Remembers whether Bluetooth was enabled or automatically.
   * @type {boolean}
   * @memberof NfcBluetooth.prototype
   */
  bluetoothAutoEnabled: false,

  /**
   * Used to prevent triggering Settings multiple times.
   * @memberof NfcHandoverManager.prototype
   */
  settingsNotified: false,

  /**
   * Debug method
   * @param {String} msg debug messages
   * @param {Object} opObject object to printed after doing JSON.stringfy
   * @memberof NfcBluetooth.prototype
   */
  _debug: function _debug(msg, optObject) {
    if (this.DEBUG) {
      this._logVisibly(msg, optObject);
    }
  },

  /**
   * Logs message in logcat
   * @param {String} msg debug messages
   * @param {Object} opObject object to printed after doing JSON.stringfy
   * @memberof NfcHandoverManager.prototype
   */
  _logVisibly: function _logVisibly(msg, optObject) {
      var output = '[NfcHandoverManager]: ' + msg;
      if (optObject) {
        output += JSON.stringify(optObject);
      }
      console.log(output);
  },

  /**
   * Initializes event and message handlers, initializes properties.
   * @memberof NfcBluetooth.prototype
   */
  init: function init() {
  	this.bluetooth = navigator.mozBluetooth;
  	this.bluetoothStatusSaved = false;
    this.bluetoothAutoEnabled = false;

    if (this.bluetooth.enabled) {
      this._debug('Bluetooth already enabled on boot');
      var req = this.bluetooth.getDefaultAdapter();
      req.onsuccess = function bt_getAdapterSuccess() {
        self.defaultAdapter = req.result;
        self._debug('MAC address: ' + self.defaultAdapter.address);
        self._debug('MAC name: ' + self.defaultAdapter.name);
      };
      req.onerror = function bt_getAdapterError() {
        self._logVisibly('init: Failed to get bluetooth adapter');
      };
    }

    window.addEventListener('bluetooth-adapter-added', function() {
      self._debug('bluetooth-adapter-added');
      var req = self.bluetooth.getDefaultAdapter();
      req.onsuccess = function bt_getAdapterSuccess() {
        self.settingsNotified = false;
        self.defaultAdapter = req.result;
        self._debug('MAC address: ' + self.defaultAdapter.address);
        self._debug('MAC name: ' + self.defaultAdapter.name);
        /*
         * Call all actions that have queued up while Bluetooth
         * was turned on.
         */
        for (var i = 0; i < self.actionQueue.length; i++) {
          var action = self.actionQueue[i];
          action.callback.apply(self, action.args);
        }
        self.actionQueue = [];
      };
      req.onerror = function bt_getAdapterError() {
        self._logVisibly('event listner: Failed to get bluetooth adater');
      };
    });

    window.addEventListener('bluetooth-disabled', function() {
      self._debug('bluetooth-disabled');
      self._clearBluetoothStatus();
    });

    window.addEventListener('save-bluetooth-status', this);
    window.addEventListener('restore-bluetooth-status', this);
    window.addEventListener('bluetooth-action', this);
  },

  handleEvent: function cr_handleEvent(evt) {
    switch(evt.type) {
      case 'save-bluetooth-status':
        this._saveBluetoothStatus();
        break;
      case 'restore-bluetooth-status':
        this._restoreBluetoothStatus();
        break;
      case 'bluetooth-action':
        this._doAction(evt.detail);
        break;
    }
  },

  /**
   * Save the on/off status of Bluetooth.
   * @memberof NfcHandoverManager.prototype
   */
  _saveBluetoothStatus: function _saveBluetoothStatus() {
    if (!this.bluetoothStatusSaved) {
      this.bluetoothStatusSaved = true;
      this.bluetoothAutoEnabled = !this.bluetooth.enabled;
    }
  },

  /**
   * Restore the Bluetooth status.
   * @memberof NfcHandoverManager.prototype
   */
  _restoreBluetoothStatus: function _restoreBluetoothStatus() {
    if (!this.isHandoverInProgress() &&
        BluetoothTransfer.isSendFileQueueEmpty) {
      if (this.bluetoothAutoEnabled) {
        this._debug('Disabling Bluetooth');
        this.settings.createLock().set({'bluetooth.enabled': false});
        this.bluetoothAutoEnabled = false;
      }
      this.bluetoothStatusSaved = false;
    }
  },

  /**
   * Forget a previously saved Bluetooth status.
   * @memberof NfcHandoverManager.prototype
   */
  _clearBluetoothStatus: function _clearBluetoothStatus() {
    this.bluetoothStatusSaved = false;
  },

  enabled: function _enabled() {
    return this.bluetooth.enabled;
  },

  getMacAddress: function _getMacAddress() {
    return this.defaultAdapter.address;
  },

  /*
   * Performs an action once Bluetooth is enabled. If Bluetooth is disabled,
   * it is enabled and the action is queued. If Bluetooth is already enabled,
   * performs the action directly.
   * @param {Object} action action to be performed
   * @param {function} action.callback function to be executed
   * @param {Array} action.args arguments for the function
   * @memberof NfcHandoverManager.prototype
   */
  _doAction: function _doAction(action) {
    if (!this.bluetooth.enabled) {
      this._debug('Bluetooth: not yet enabled');
      this.actionQueue.push(action);
      if (this.settingsNotified === false) {
        this.settings.createLock().set({'bluetooth.enabled': true});
        this.settingsNotified = true;
      }
    } else {
      switch (action.callback) {
        case 'pairing':
          this._doPairing(action.args);
          break;
        default:
          window.dispatchEvent(new CustomEvent('nfc-' +
            action.callback, {detail: action}));
          break;
      }
    }
  },

  /**
   * Performs bluetooth pairing with other device
   * @param {string} mac MAC address of the peer device
   * @memberof NfcHandoverManager.prototype
   */
  _doPairing: function _doPairing(mac) {
    this._debug('doPairing: ' + mac);
    if (this.defaultAdapter == null) {
      // No BT
      this._debug('No defaultAdapter');
      return;
    }
    var req = this.defaultAdapter.pair(mac);
    var self = this;
    req.onsuccess = function() {
      self._debug('Pairing succeeded');
      self._clearBluetoothStatus();
      self._doConnect(mac);
    };
    req.onerror = function() {
      self._logVisibly('Pairing failed');
      self._restoreBluetoothStatus();
    };
  },

  /**
   * Connects via bluetooth to the paired device.
   * @param {string} mac MAC addres of the paired device
   * @memberof NfcHandoverManager.prototype
   */
  _doConnect: function _doConnect(mac) {
    this._debug('doConnect with: ' + mac);
    /*
     * Bug 979427:
     * After pairing we connect to the remote device. The only thing we
     * know here is the MAC address, but the defaultAdapter.connect()
     * requires a BluetoothDevice argument. So we use getPairedDevices()
     * to map the MAC to a BluetoothDevice instance.
     */
    var req = this.defaultAdapter.getPairedDevices();
    var self = this;
    req.onsuccess = function() {
      var devices = req.result;
      self._debug('# devices: ' + devices.length);
      var successCb = function() { self._debug('Connect succeeded'); };
      var errorCb = function() { self._debug('Connect failed'); };
      for (var i = 0; i < devices.length; i++) {
        var device = devices[i];
        self._debug('Address: ' + device.address);
        self._debug('Connected: ' + device.connected);
        if (device.address.toLowerCase() == mac.toLowerCase()) {
              self._debug('Connecting to ' + mac);
              var r = self.defaultAdapter.connect(device);
              r.onsuccess = successCb;
              r.onerror = errorCb;
        }
      }
    };
    req.onerror = function() {
      self._logVisibly('Cannot get paired devices from adapter.');
    };
  }
};
