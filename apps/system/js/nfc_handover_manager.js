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
    'bluetooth-enabled',
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
     * Default bluetooth adapter
     * @type {Object}
     * @memberof NfcHandoverManager.prototype
     */
    _adapter: null,

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
      this.incomingFileTransferInProgress = false;
      this.bluetoothStatusSaved = false;
      this.bluetoothAutoEnabled = false;

      // Besides listening to bluetooth-enabled event,
      // request the adapter at module start to 
      // avoid the module loading dependency
      Service.request('Bluetooth:adapter').then((adapter) => {
        this._adapter = adapter;
      }).catch((err) => {
        this._logVisibly('Failed to get bluetooth adapter at start');
      });

      window.navigator.mozSetMessageHandler('nfc-manager-send-file',
        (msg) => {
          this.debug('In New event nfc-manager-send-file' +
            JSON.stringify(msg));
          this.handleFileTransfer(msg);
      });
    },

    '_handle_nfc-transfer-completed': function(evt) {
      this.transferComplete(evt);
    },

    '_handle_nfc-transfer-started': function(evt) {
      this._transferStarted(evt);
    },

    '_handle_bluetooth-disabled': function() {
      this.debug('bluetooth-disabled');
      this._adapter = null;
      this._clearBluetoothStatus();
    },

    '_handle_bluetooth-enabled': function() {
      this.debug('bluetooth-enabled');
      // wait for adapter is ready
      Service.request('Bluetooth:adapter').then((adapter) => {
        this._adapter = adapter;
        this.settingsNotified = false;
        this.debug('MAC address: ' + adapter.address);
        this.debug('MAC name: ' + adapter.name);
        this.debug('process queued actions');
        /*
         * Call all actions that have queued up while Bluetooth
         * was turned on.
         */
        for (var i = 0, len = this.actionQueue.length; i < len; i++) {
          var action = this.actionQueue[i];
          action.callback.apply(this, action.args);
        }
        this.actionQueue = [];
      }).catch(() => {
        this._logVisibly('event listener: Failed to get bluetooth adapter');
      });
    },

    /**
     * Save the on/off status of Bluetooth.
     * @memberof NfcHandoverManager.prototype
     */
    _saveBluetoothStatus: function _saveBluetoothStatus() {
      if (!this.bluetoothStatusSaved) {
        this.bluetoothStatusSaved = true;
        this.bluetoothAutoEnabled = !Service.query('Bluetooth.isEnabled');
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
          this.debug('Disabling Bluetooth');
          this.publish('request-disable-bluetooth', this,
            /* no prefix */ true);
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
      var enabled = Service.query('Bluetooth.isEnabled');
      if (enabled === undefined) {
        this._logVisibly('Bluetooth is not available yet');
        return;
      }

      if (!enabled) {
        this.debug('Bluetooth: not yet enabled');
        this.actionQueue.push(action);
        if (this.settingsNotified === false) {
          this.publish('request-enable-bluetooth', this,
            /* no prefix */ true);
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
        this.debug('Bad handover messsage');
        return null;
      }
      var btsspRecord = NDEFUtils.searchForBluetoothAC(handover);
      if (btsspRecord == null) {
        // There is no Bluetooth Alternative Carrier record in the
        // Handover Select message. Since we cannot handle WiFi Direct,
        // just ignore.
        this.debug('No BT AC');
        return null;
      }
      return NDEFUtils.parseBluetoothSSP(btsspRecord);
    },

    /**
     * Look for a paired device and invoke the appropriate callback function.
     * @param {string} mac MAC address of the device
     * @param {function} foundCb Found callback
     * @param {function} notFoundCb Not found callback
     * @memberof NfcHandoverManager.prototype
     */
    _findPairedDevice: function _findPairedDevice(mac, foundCb, notFoundCb) {
      this.debug('_findPairedDevice');
      Service.request('Bluetooth:getPairedDevices').then((devices) => {
        this.debug('# devices: ' + devices.length);
        for (var i = 0, len = devices.length; i < len; i++) {
          var device = devices[i];
          this.debug('Address: ' + device.address);
          if (device.address.toLowerCase() === mac.toLowerCase()) {
            this.debug('Found device ' + mac);
            foundCb(device);
            return;
          }
        }
        if (notFoundCb) {
          notFoundCb();
        }
      }).catch((err) => {
        this._logVisibly('Cannot get paired devices from adapter: ' + err);
      });
    },

    /**
     * Connects via bluetooth to the paired device.
     * @param {string} device Device to be paired
     * @memberof NfcHandoverManager.prototype
     */
    _doConnect: function _doConnect(device) {
      this.debug('doConnect with: ' + device.address);
      if (this._adapter === null) {
        this._logVisibly('No Bluetooth Adapter');
        return;
      }

      var req = this._adapter.connect(device);
      req.onsuccess = () => { this.debug('Connect succeeded'); };
      req.onerror = () => { this.debug('Connect failed'); };
    },

    /**
     * Performs bluetooth pairing with other device
     * @param {string} mac MAC address of the peer device
     * @memberof NfcHandoverManager.prototype
     */
    _doPairing: function _doPairing(mac) {
      this.debug('doPairing: ' + mac);

      var alreadyPaired = (device) => {
        if (this._adapter === null) {
          this._logVisibly('No Bluetooth Adapter');
          return;
        }

        this._adapter.connect(device);
      };

      var notYetPaired = () => {
        this.debug('Device not yet paired');
        Service.request('Bluetooth:pair', mac).then(() => {
          this.debug('Pairing succeeded');
          this._clearBluetoothStatus();
          /*
           * Bug 979427:
           * After pairing we connect to the remote device. The only thing we
           * know here is the MAC address, but the defaultAdapter.connect()
           * requires a BluetoothDevice argument. So we use _findPairedDevice()
           * to map the MAC to a BluetoothDevice instance.
           */
          this._findPairedDevice(mac, (device) => {
            this._doConnect(device);
          });
        }).catch((err) => {
          this.debug(err);
          this._logVisibly('Pairing failed');
          this._restoreBluetoothStatus();
        });
      };

      this._findPairedDevice(mac, alreadyPaired, notYetPaired);
    },

    /**
     * Show an error notification when file transfer failed.
     * @param {String} msg Optional message.
     * @memberof NfcHandoverManager.prototype
     */
    _showFailedNotification: function _showFailedNotification(title, msg) {
      var body = (msg !== undefined) ? msg : '';
      var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';
      NotificationHelper.send(title, {
        body: body,
        icon: icon
      });
    },

    /**
     * Show 'send failed, try again' notification.
     * @memberof NfcHandoverManager.prototype
     */
    _showTryAgainNotification: function _showTryAgainNotification() {
      var _ = navigator.mozL10n.get;
      this._showFailedNotification('transferFinished-sentFailed-title',
                                  _('transferFinished-try-again-description'));
    },

    /**
     * This function will be called after a timeout when we did not receive the
     * Hs record within three seconds. At this point we cancel the file
     * transfer.
     * @memberof NfcHandoverManager.prototype
     */
    _cancelSendFileTransfer: function _cancelSendFileTransfer() {
      this.debug('_cancelSendFileTransfer');
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
      this.debug('_cancelIncomingFileTransfer');
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
      this.debug('doFileTransfer');
      if (this.sendFileQueue.length === 0) {
        // Nothing to do
        this.debug('sendFileQueue empty');
        return;
      }
      this.debug('Send blob to ' + mac);
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
      this.debug('doHandoverRequest');
      if (this._getBluetoothSSP(ndef) == null) {
        /*
         * The handover request didn't contain a valid MAC address. Simply
         * ignore the request.
         */
        return;
      }
      if (this._adapter === null) {
        this._logVisibly('No Bluetooth Adapter');
        return;
      }

      if (nfcPeer.isLost) {
        this._logVisibly('NFC peer went away during doHandoverRequest');
        this._showFailedNotification('transferFinished-receivedFailed-title');
        this._restoreBluetoothStatus();
        return;
      }

      var cps = Service.query('Bluetooth.isEnabled') ?
                              NDEF.CPS_ACTIVE : NDEF.CPS_ACTIVATING;
      var mac = this._adapter.address;
      var hs = NDEFUtils.encodeHandoverSelect(mac, cps);
      nfcPeer.sendNDEF(hs).then(() => {
        this.debug('sendNDEF(hs) succeeded');
        this.incomingFileTransferInProgress = true;
      }).catch((e) => {
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
     * @param {Object} msg message object
     * @param {MozNFCPeer} msg.peer An instance of MozNFCPeer object.
     * @param {Blob} msg.blob File to be sent.
     * @param {String} msg.requestId Request ID.
     * @memberof NfcHandoverManager.prototype
     */
    _initiateFileTransfer:
      function _initiateFileTransfer(msg) {
        this.debug('initiateFileTransfer');
        if (this._adapter === null) {
          this._logVisibly('No Bluetooth Adapter');
          this._restoreBluetoothStatus();
          return;
        }

        /*
         * Initiate a file transfer by sending a Handover Request to the
         * remote device.
         */
        var onsuccess = () => {
          this._dispatchSendFileStatus(0, msg.requestId);
        };
        var onerror = () => {
          this._dispatchSendFileStatus(1, msg.requestId);
        };

        if (msg.peer.isLost) {
          this._logVisibly('NFC peer went away during initiateFileTransfer');
          onerror();
          this._restoreBluetoothStatus();
          this._showFailedNotification('transferFinished-sentFailed-title',
                                       msg.blob.name);
          return;
        }
        var job = {nfcPeer: msg.peer, blob: msg.blob, requestId: msg.requestId,
                   onsuccess: onsuccess, onerror: onerror};
        this.sendFileQueue.push(job);
        var cps = Service.query('Bluetooth.isEnabled') ?
                                NDEF.CPS_ACTIVE : NDEF.CPS_ACTIVATING;
        var mac = this._adapter.address;
        var hr = NDEFUtils.encodeHandoverRequest(mac, cps);

        msg.peer.sendNDEF(hr).then(() => {
          this.debug('sendNDEF(hr) succeeded');
        }).catch((e) => {
          this.debug('sendNDEF(hr) failed : ' + e);
          onerror();
          this.sendFileQueue.pop();
          this._clearTimeout();
          this._restoreBluetoothStatus();
          this._showFailedNotification('transferFinished-sentFailed-title',
                                       msg.blob.name);
        });
        this._clearTimeout();
        this.responseTimeoutFunction =
          setTimeout(this._cancelSendFileTransfer.bind(this),
                     this.responseTimeoutMillis);
    },

    /**
     * Clears timeout that handles the case an outstanding handover message
     * has not been received within a certain timeframe.
     * @memberof NfcHandoverManager.prototype
     */
    _clearTimeout: function _clearTimeout() {
      this.debug('_clearTimeout');
      if (this.responseTimeoutFunction != null) {
        // Clear the timeout that handles error
        this.debug('clearing timeout');
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
        this.debug('In dispatchSendFileStatus ' + status);
        navigator.mozNfc.notifySendFileStatus(status, requestId);
      },

    /**
     * Handles connection request by asking user for confirmation.
     * @param {Object} btssp BT SSP (Secure Simple Pairing) data.
     * @memberof NfcHandoverManager.prototype
     */
    _onRequestConnect: function _onRequestConnect(btssp) {
      var onconfirm = () => {
        this.debug('Connect confirmed');
        this._doAction({callback: this._doPairing, args: [btssp.mac]});
      };
      var onabort = () => {
        this.debug('Connect aborted');
      };
      if (!this.nfcConnectSystemDialog) {
        LazyLoader.load('js/system_nfc_connect_dialog.js').then(() => {
          this.nfcConnectSystemDialog = new NfcConnectSystemDialog();
          this.nfcConnectSystemDialog.show(btssp.localName, onconfirm, onabort);
        }).catch((err) => {
          console.error(err);
        });
      } else {
        this.nfcConnectSystemDialog.show(btssp.localName, onconfirm, onabort);
      }
    },

    /**
     * Check if a device is already paired and connected.
     *
     * BTv2 deprecate the device.connected property.
     * connect stat should be retrieved by adapter.getConnectedDevices API
     *
     * @param {Object} btssp BT SSP record
     * @memberof NfcHandoverManager.prototype
     */
    _checkConnected: function _checkConnected(btssp) {
      if (!Service.query('Bluetooth.isEnabled')) {
        this._onRequestConnect(btssp);
        return;
      }
      if (this._adapter === null) {
        this._logVisibly('No Bluetooth Adapter');
        return;
      }
      var connected = false;
      // Service Class Name: OBEXObjectPush, UUID: 0x1105
      // Specification: Object Push Profile (OPP)
      // NOTE: Used as both Service Class Identifier and Profile.
      // Allowed Usage: Service Class/Profile
      // https://www.bluetooth.org/en-us/specification/assigned-numbers/
      // service-discovery
      var serviceUuid = '0x1105';
      var req = this._adapter.getConnectedDevices(serviceUuid);
      req.onsuccess = () => {
        if (req.result) {
          this.debug('got connectedList');
          var connectedList = req.result;
          var length = connectedList.length;
          for (var i = 0; i < length; i++) {
            if (connectedList[i].address == btssp.mac) {
              connected = true;
            }
          }
          if (!connected) {
            this._onRequestConnect(btssp);
          }
        } else {
          this._logVisibly('Can not get connected device result.');
          return;
        }
      };
      req.onerror = () => {
        this.debug('Can not check is device connected from adapter.');
        this._onRequestConnect(btssp);
      };
    },

    /**
     * Handles simplified pairing record.
     * @param {Array} ndef NDEF message containing simplified pairing record
     * @memberof NfcHandoverManager.prototype
     */
    _handleSimplifiedPairingRecord: function _handlePairingRecord(ndef) {
      this.debug('_handleSimplifiedPairingRecord');
      var pairingRecord = ndef[0];
      var btssp = NDEFUtils.parseBluetoothSSP(pairingRecord);
      this.debug('Simplified pairing with: ' + btssp.mac);
      this._checkConnected(btssp);
    },

    /**
     * Handle NDEF Handover Select message.
     * @param {Array} ndef NDEF message containing handover select record
     * @memberof NfcHandoverManager.prototype
     */
    _handleHandoverSelect: function _handleHandoverSelect(ndef) {
      this.debug('_handleHandoverSelect');
      this._clearTimeout();
      var btssp = this._getBluetoothSSP(ndef);
      if (btssp == null) {
        if (this.sendFileQueue.length !== 0) {
          // We tried to send a file but the other device gave us an empty AC
          // record. This will happen if the other device is currently
          // transferring a file. Show a 'try later' notification.
          this.debug('Other device is transferring file. Aborting');
          var job = this.sendFileQueue.shift();
          job.onerror();
          this._showTryAgainNotification();
        }
        this._restoreBluetoothStatus();
        return;
      }

      if (this.sendFileQueue.length !== 0) {
        // This is the response to a file transfer request (negotiated handover)
        this._doAction({callback: this._doFileTransfer, args: [btssp.mac]});
      } else {
        // This is a static handover
        this._checkConnected(btssp);
      }
    },

    /**
     * Handles NDEF Handover Request message.
     * @param {Array} ndef NDEF message containing handover request record
     * @param {MozNFCPeer} MozNFCPeer object.
     * @memberof NfcHandoverManager.prototype
     */
    _handleHandoverRequest: function _handleHandoverRequest(ndef, nfcPeer) {
      this.debug('_handleHandoverRequest');
      if (Service.query('BluetoothTransfer.isFileTransferInProgress')) {
        // We don't allow concurrent file transfers
        this.debug('This device is currently transferring a file. ' +
                    'Aborting via empty Hs');
        var hs = NDEFUtils.encodeEmptyHandoverSelect();
        nfcPeer.sendNDEF(hs);
        return;
      }
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
      this.debug('tryHandover: ', ndefMsg);
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
     * @param {Object} msg message object
     * @param {MozNFCPeer} msg.peer An instance of MozNFCPeer object.
     * @param {Blob} msg.blob File to be sent.
     * @param {String} msg.requestId Request ID.
     * @memberof NfcHandoverManager.prototype
     */
    handleFileTransfer: function handleFileTransfer(msg) {
      this.debug('handleFileTransfer');
      if (Service.query('BluetoothTransfer.isFileTransferInProgress')) {
        // We don't allow concurrent file transfers
        this.debug('This device is already transferring a file. Aborting');
        this._dispatchSendFileStatus(1, msg.requestId);
        this._showTryAgainNotification();
        return;
      }
      this._saveBluetoothStatus();
      this._doAction({
        callback: this._initiateFileTransfer,
        args: [msg]});
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
      this.debug('transferComplete: ' + JSON.stringify(details));
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
