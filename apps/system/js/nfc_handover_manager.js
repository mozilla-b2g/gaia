/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc. */

/* globals NDEFUtils, NfcConnectSystemDialog, LazyLoader,
           NDEF, NfcUtils, NotificationHelper, BaseModule, Service */
'use strict';

/**
 * NfcHandoverManager handles handovers from other Bluetooth devices according
 * to the specification of the NFC Forum
 * (Document: NFCForum-TS-ConnectionHandover_1_2.doc).
 * @class NfcHandoverManager
 */

(function() {
  var NfcHandoverManager = function() {};

  NfcHandoverManager.STATES = [
    'isHandoverInProgress'
  ];

  NfcHandoverManager.SETTINGS = [
    'nfc.debugging.enabled'
  ];

  NfcHandoverManager.EVENTS = [
    'bluetooth-adapter-added',
    'bluetooth-disabled',
    'nfc-transfer-started',
    'nfc-transfer-completed'
  ];

  BaseModule.create(NfcHandoverManager, {
    name: 'NfcHandoverManager',
     /**
     * Flag which turns on debuging messages
     * @type {boolean}
     * @memberof NfcHandoverManager.prototype
     */
    DEBUG: false,

    /**
     * mozBluetooth object
     * @type {Object}
     * @memberof NfcHandoverManager.prototype
     */
    bluetooth: null,

    /**
     * Default bluetooth adapter
     * @type {Object}
     * @memberof NfcHandoverManager.prototype
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
     * Keeps a list of send file requests made via peer.sendFile(blob).
     * It will be inspected in the handling of Handover Select messages
     * to distinguish between static and negotiated handovers.
     * @type {Object}
     * @memberof NfcHandoverManager.prototype
     */
    sendFileQueue: [],

    /**
     * The length of the timeout in milliseconds to wait for an outstanding
     * handover response.
     * @type {Number}
     * @memberof NfcHandoverManager.prototype
     */
    responseTimeoutMillis: 9000,

    /**
     * Set whenever a timeout is defined while waiting for an outstanding
     * handover response.
     * @type {Object}
     * @memberof NfcHandoverManager.prototype
     */
    responseTimeoutFunction: null,

    /**
     * Set to true during a file transfer that was initiated by another device.
     * @type {boolean}
     * @memberof NfcHandoverManager.prototype
     */
    incomingFileTransferInProgress: false,

    /**
     * Remembers whether Bluetooth was already saved during an earlier
     * file transfer.
     * @type {boolean}
     * @memberof NfcHandoverManager.prototype
     */
    bluetoothStatusSaved: false,

    /**
     * Remembers whether Bluetooth was enabled or automatically.
     * @type {boolean}
     * @memberof NfcHandoverManager.prototype
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
     * @memberof NfcHandoverManager.prototype
     */
    _debug: function _debug(msg, optObject) {
      if (this.DEBUG) {
        this._logVisibly(msg, optObject);
      }
    },

    _hasInititialized: false,

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

    '_observe_nfc.debugging.enabled': function(enabled) {
      this.DEBUG = enabled;
    },

    /**
     * Initializes event and message handlers, initializes properties.
     * @memberof NfcHandoverManager.prototype
     */
    _start: function _start() {
      var self = this;

      this.bluetooth = navigator.mozBluetooth;

      this.incomingFileTransferInProgress = false;
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

      window.navigator.mozSetMessageHandler('nfc-manager-send-file',
        function(msg) {
          self._debug('In New event nfc-manager-send-file' +
            JSON.stringify(msg));
          self.handleFileTransfer(msg.peer, msg.blob, msg.requestId);
      });
    },

    '_handle_nfc-transfer-completed': function(evt) {
      this.transferComplete(evt);
    },

    '_handle_nfc-transfer-started': function(evt) {
      this._transferStarted(evt);
    },

    '_handle_bluetooth-disabled': function() {
      this._debug('bluetooth-disabled');
      this._clearBluetoothStatus();
    },

    '_handle_bluetooth-adapter-added': function() {
      var self = this;
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
          Service.query('BluetoothTransfer.isSendFileQueueEmpty')) {
        if (this.bluetoothAutoEnabled) {
          this._debug('Disabling Bluetooth');
          // XXX: Let BluetoothCore do this for you
          this.writeSetting({'bluetooth.enabled': false});
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
        // XXX: Let BluetoothCore do this for you
          this.writeSetting({'bluetooth.enabled': true});
          this.settingsNotified = true;
        }
      } else {
        action.callback.apply(this, action.args);
      }
    },

    /**
     * Gets the data about other device taking part in handover proces
     * from NDEF message
     * @param {Array} ndef NDEF message
     * @returns {Object} ssp - object containing info about other devices
     * @returns {string} ssp.mac - mac addres of other devices
     * @returns {string} ssp.localName - local name if present in NDEF message,
     * null otherwise
     * @memberof NfcHandoverManager.prototype
     */
    _getBluetoothSSP: function _getBluetoothSSP(ndef) {
      var handover = NDEFUtils.parseHandoverNDEF(ndef);
      if (handover == null) {
        // Bad handover message. Just ignore.
        this._debug('Bad handover messsage');
        return null;
      }
      var btsspRecord = NDEFUtils.searchForBluetoothAC(handover);
      if (btsspRecord == null) {
        // There is no Bluetooth Alternative Carrier record in the
        // Handover Select message. Since we cannot handle WiFi Direct,
        // just ignore.
        this._debug('No BT AC');
        return null;
      }
      return NDEFUtils.parseBluetoothSSP(btsspRecord);
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
     * Show an error notification when file transfer failed.
     * @param {String} name Optional file name.
     * @memberof NfcHandoverManager.prototype
     */
    _showFailedNotification: function _showFailedNotification(title, name) {
      var fileName = (name !== undefined) ? name : '';
      var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';
      NotificationHelper.send(title, {
        body: fileName,
        icon: icon
      });
    },

    /**
     * This function will be called after a timeout when we did not receive the
     * Hs record within three seconds. At this point we cancel the file
     * transfer.
     * @memberof NfcHandoverManager.prototype
     */
    _cancelSendFileTransfer: function _cancelSendFileTransfer() {
      this._debug('_cancelSendFileTransfer');
      this.responseTimeoutFunction = null;
      var job = this.sendFileQueue.pop();
      job.onerror();
      this._showFailedNotification('transferFinished-sentFailed-title',
                                   job.blob.name);
      this._restoreBluetoothStatus();
    },

    /**
     * This function will be called after a timeout when we did not receive
     * the Hs record within three seconds. At this point we cancel the file
     * transfer.
     * @memberof NfcHandoverManager.prototype
     */
    _cancelIncomingFileTransfer: function _cancelIncomingFileTransfer() {
      this._debug('_cancelIncomingFileTransfer');
      this.responseTimeoutFunction = null;
      this.incomingFileTransferInProgress = false;
      this._showFailedNotification('transferFinished-receivedFailed-title');
      this._restoreBluetoothStatus();
    },

    /**
     * Performs bluetooth file transfer if this.sendFileRequest exists
     * to other device
     * @param {string} mac MAC address of the other device
     * @memberof NfcHandoverManager.prototype
     */
    _doFileTransfer: function _doFileTransfer(mac) {
      this._debug('doFileTransfer');
      if (this.sendFileQueue.length === 0) {
        // Nothing to do
        this._debug('sendFileQueue empty');
        return;
      }
      this._debug('Send blob to ' + mac);
      var blob = this.sendFileQueue[0].blob;
      this.publish('bluetooth-sendfile-via-handover', {
        mac: mac,
        blob: blob
      });
    },

    /**
     * Performs tha actual handover request
     * @param {Array} ndef NDEF message conating the handover request record
     * @param {MozNFCPeer} MozNFCPeer object.
     * @memberof NfcHandoverManager.prototype
     */
    _doHandoverRequest: function _doHandoverRequest(ndef, nfcPeer) {
      this._debug('doHandoverRequest');
      if (this._getBluetoothSSP(ndef) == null) {
        /*
         * The handover request didn't contain a valid MAC address. Simply
         * ignore the request.
         */
        return;
      }

      if (nfcPeer.isLost) {
        this._logVisibly('NFC peer went away during doHandoverRequest');
        this._showFailedNotification('transferFinished-receivedFailed-title');
        this._restoreBluetoothStatus();
        return;
      }

      var cps = this.bluetooth.enabled ? NDEF.CPS_ACTIVE : NDEF.CPS_ACTIVATING;
      var mac = this.defaultAdapter.address;
      var hs = NDEFUtils.encodeHandoverSelect(mac, cps);
      var promise = nfcPeer.sendNDEF(hs);
      promise.then(() => {
        this._debug('sendNDEF(hs) succeeded');
        this.incomingFileTransferInProgress = true;
      }).catch(e => {
        this._logVisibly('sendNDEF(hs) failed : ' + e);
        this._clearTimeout();
        this._restoreBluetoothStatus();
      });

      this._clearTimeout();
      this.responseTimeoutFunction =
        setTimeout(this._cancelIncomingFileTransfer.bind(this),
                   this.responseTimeoutMillis);
    },

    /**
     * Initiate a file transfer by sending a Handover Request to the
     * remote device.
     * @param {MozNFCPeer} An instance of MozNFCPeer object.
     * @param {Blob} blob File to be sent.
     * @param {String} requestId Request ID.
     * @memberof NfcHandoverManager.prototype
     */
    _initiateFileTransfer:
      function _initiateFileTransfer(nfcPeer, blob, requestId) {
        this._debug('initiateFileTransfer');
        /*
         * Initiate a file transfer by sending a Handover Request to the
         * remote device.
         */
        var self = this;
        var onsuccess = function() {
          self._dispatchSendFileStatus(0, requestId);
        };
        var onerror = function() {
          self._dispatchSendFileStatus(1, requestId);
        };

        if (nfcPeer.isLost) {
          this._logVisibly('NFC peer went away during initiateFileTransfer');
          onerror();
          this._restoreBluetoothStatus();
          this._showFailedNotification('transferFinished-sentFailed-title',
                                       blob.name);
          return;
        }
        var job = {nfcPeer: nfcPeer, blob: blob, requestId: requestId,
                   onsuccess: onsuccess, onerror: onerror};
        this.sendFileQueue.push(job);
        var cps =
          this.bluetooth.enabled ? NDEF.CPS_ACTIVE : NDEF.CPS_ACTIVATING;
        var mac = this.defaultAdapter.address;
        var hr = NDEFUtils.encodeHandoverRequest(mac, cps);
        var promise = nfcPeer.sendNDEF(hr);

        promise.then(() => {
          this._debug('sendNDEF(hr) succeeded');
        }).catch(e => {
          this._debug('sendNDEF(hr) failed : ' + e);
          onerror();
          this.sendFileQueue.pop();
          this._clearTimeout();
          this._restoreBluetoothStatus();
          this._showFailedNotification('transferFinished-sentFailed-title',
                                       blob.name);
        });
        this._clearTimeout();
        this.responseTimeoutFunction =
          setTimeout(this._cancelSendFileTransfer.bind(this),
                     this.responseTimeoutMillis);
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
    },

    /**
     * Clears timeout that handles the case an outstanding handover message
     * has not been received within a certain timeframe.
     * @memberof NfcHandoverManager.prototype
     */
    _clearTimeout: function _clearTimeout() {
      this._debug('_clearTimeout');
      if (this.responseTimeoutFunction != null) {
        // Clear the timeout that handles error
        this._debug('clearing timeout');
        clearTimeout(this.responseTimeoutFunction);
        this.responseTimeoutFunction = null;
      }
    },

    /**
     * Dispatches status of file sending to mozNfc.
     * @param {number} status status of file send operation
     * @param {string} request ID of the operation
     * @memberof NfcHandoverManager.prototype
     */
    _dispatchSendFileStatus:
      function _dispatchSendFileStatus(status, requestId) {
        this._debug('In dispatchSendFileStatus ' + status);
        navigator.mozNfc.notifySendFileStatus(status, requestId);
      },

    /**
     * Handles connection request by asking user for confirmation.
     * @param {Object} btssp BT SSP (Secure Simple Pairing) data.
     * @memberof NfcHandoverManager.prototype
     */
    _onRequestConnect: function _onRequestConnect(btssp) {
      var self = this;
      var onconfirm = function() {
        self._debug('Connect confirmed');
        self._doAction({callback: self._doPairing, args: [btssp.mac]});
      };
      var onabort = function() {
        self._debug('Connect aborted');
      };
      if (!this.nfcConnectSystemDialog) {
        LazyLoader.load('js/system_nfc_connect_dialog.js', function() {
          this.nfcConnectSystemDialog = new NfcConnectSystemDialog();
          this.nfcConnectSystemDialog.show(btssp.localName, onconfirm, onabort);
        }.bind(this));
      } else {
        this.nfcConnectSystemDialog.show(btssp.localName, onconfirm, onabort);
      }
    },

    /**
     * Handles simplified pairing record.
     * @param {Array} ndef NDEF message containing simplified pairing record
     * @memberof NfcHandoverManager.prototype
     */
    _handleSimplifiedPairingRecord:
    function _handleSimplifiedPairingRecord(ndef) {
      this._debug('_handleSimplifiedPairingRecord');
      var pairingRecord = ndef[0];
      var btssp = NDEFUtils.parseBluetoothSSP(pairingRecord);
      this._debug('Simplified pairing with: ' + btssp.mac);
      this._onRequestConnect(btssp);
    },

    /**
     * Handle NDEF Handover Select message.
     * @param {Array} ndef NDEF message containing handover select record
     * @memberof NfcHandoverManager.prototype
     */
    _handleHandoverSelect: function _handleHandoverSelect(ndef) {
      this._debug('_handleHandoverSelect');
      this._clearTimeout();
      var btssp = this._getBluetoothSSP(ndef);
      if (btssp == null) {
        return;
      }

      if (this.sendFileQueue.length !== 0) {
        // This is the response to a file transfer request (negotiated handover)
        this._doAction({callback: this._doFileTransfer, args: [btssp.mac]});
      } else {
        // This is a static handover
        this._onRequestConnect(btssp);
      }
    },

    /**
     * Handles NDEF Handover Request message.
     * @param {Array} ndef NDEF message containing handover request record
     * @param {MozNFCPeer} MozNFCPeer object.
     * @memberof NfcHandoverManager.prototype
     */
    _handleHandoverRequest: function _handleHandoverRequest(ndef, nfcPeer) {
      this._debug('_handleHandoverRequest');
      this._saveBluetoothStatus();
      this._doAction({
        callback: this._doHandoverRequest,
        args: [ndef, nfcPeer]
      });
    },

    /**
     * Checks if the first record of NDEF message is a handover record.
     * If yes the NDEF message is handled according to handover record type.
     * @param {Array} ndefMsg array of NDEF records
     * @param {MozNFCPeer} MozNFCPeer object.
     * @returns {boolean} true if handover record was found and handled, false
     * if no handover record was found
     * @memberof NfcHandoverManager.prototype
     */
    tryHandover: function(ndefMsg, nfcPeer) {
      this._debug('tryHandover: ', ndefMsg);
      var nfcUtils = new NfcUtils();
      if (!Array.isArray(ndefMsg) || !ndefMsg.length) {
        return false;
      }

      var record = ndefMsg[0];
      if (record.tnf === NDEF.TNF_WELL_KNOWN) {
        if (nfcUtils.equalArrays(record.type, NDEF.RTD_HANDOVER_SELECT)) {
          this._handleHandoverSelect(ndefMsg);
          return true;
        } else if (nfcUtils.equalArrays(
          record.type, NDEF.RTD_HANDOVER_REQUEST)) {
          this._handleHandoverRequest(ndefMsg, nfcPeer);
          return true;
        }
      } else if ((record.tnf === NDEF.TNF_MIME_MEDIA) &&
          nfcUtils.equalArrays(record.type, NDEF.MIME_BLUETOOTH_OOB)) {
        this._handleSimplifiedPairingRecord(ndefMsg);
        return true;
      }

      return false;
    },

    /**
     * Trigger a file transfer with a remote device via BT.
     * @param {MozNFCPeer} An instance of MozNFCPeer object.
     * @param {Blob} blob File to be sent.
     * @param {String} requestId Request ID.
     * @memberof NfcHandoverManager.prototype
     */
    handleFileTransfer: function handleFileTransfer(nfcPeer, blob, requestId) {
      this._debug('handleFileTransfer');
      this._saveBluetoothStatus();
      this._doAction({
        callback: this._initiateFileTransfer,
        args: [nfcPeer, blob, requestId]});
    },

    /**
     * Returns true if a handover is in progress.
     * @returns {boolean} true if handover is in progress.
     * @memberof NfcHandoverManager.prototype
     */
    isHandoverInProgress: function isHandoverInProgress() {
      return (this.sendFileQueue.length !== 0) ||
             (this.incomingFileTransferInProgress === true);
    },

    /**
     * BluetoothTransfer notifies us that a file transfer has started.
     * @memberof NfcHandoverManager.prototype
     */
    _transferStarted: function bt__transferStarted() {
      this._clearTimeout();
    },

    /**
     * Tells NfcHandoverManager that a BT file transfer
     * has been completed.
     * @param details succeeded True if file transfer was successfull.
     * @memberof NfcHandoverManager.prototype
     */
    transferComplete: function transferComplete(evt) {
      var details = evt.detail;
      this._debug('transferComplete: ' + JSON.stringify(details));
      if (!details.received && details.viaHandover) {
        // Completed an outgoing send file request. Call onsuccess/onerror
        var job = this.sendFileQueue.shift();
        if (details.success) {
          job.onsuccess();
        } else {
          job.onerror();
        }
      }
      if (details.received) {
        // We know that a file was received but we do not know if that
        // file was sent via a NFC handover. Clearing the
        // incomingFileTransferInProgress flag here could lead to an
        // unavoidable race condition
        this.incomingFileTransferInProgress = false;
      }
      this._restoreBluetoothStatus();
    }
  });
}());
