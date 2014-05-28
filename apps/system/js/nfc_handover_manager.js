/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc. */

/* globals dump, BluetoothTransfer, NDEFUtils, NfcConnectSystemDialog */
/* exported NfcHandoverManager */
'use strict';

/*******************************************************************************
 * NfcHandoverManager handles handovers from other Bluetooth devices according
 * to the specification of the NFC Forum (Document:
 * NFCForum-TS-ConnectionHandover_1_2.doc). NfcHandoverManager exports five
 * functions:
 * - handleHandoverRequest: handle NDEF Handover Request messages
 * - handleHandoverSelect: handle NDEF Handover Select message
 * - handleFileTransfer: trigger a file transfer with a remote device via BT.
 * - isHandoverInProgress: returns true if a handover is in progress.
 * - transferComplete: tell NfcHandoverManager that a file transfer completed.
 */
var NfcHandoverManager = {

  DEBUG: false,

  settings: null,
  bluetooth: null,
  nfc: null,

  defaultAdapter: null,

  /*
   * actionQueue keeps a list of actions that need to be performed after
   * Bluetooth is turned on.
   */
  actionQueue: [],

  /*
   * sendFileQueue keeps a list of ongoing send file requests made via
   * peer.sendFile(blob).
   */
  sendFileQueue: [],

  /*
   * incomingFileTransferInProgress is set to true during a file transfer
   * that was initiated by another device.
   */
  incomingFileTransferInProgress: false,

  /*
   * The bluetoothAutoEnabled flag remembers whether Bluetooth was enabled
   * or disabled prior to a file transfer.
   */
  bluetoothStatusSaved: false,
  bluetoothAutoEnabled: false,

  /*
   * settingsNotified is used to prevent triggering Settings multiple times.
   */
  settingsNotified: false,


  /*****************************************************************************
   *****************************************************************************
   * Utility functions/classes
   *****************************************************************************
   ****************************************************************************/

  /**
   * Debug method
   */
  debug: function debug(msg, optObject) {
    if (this.DEBUG) {
      var output = '[DEBUG] SYSTEM NFC-HANDOVER: ' + msg;
      if (optObject) {
        output += JSON.stringify(optObject);
      }
      if (typeof dump !== 'undefined') {
        dump(output);
      } else {
        console.log(output);
      }
    }
  },

  /*****************************************************************************
   *****************************************************************************
   * Initialize event handlers
   *****************************************************************************
   ****************************************************************************/

  init: function init() {
    var self = this;

    this.settings = navigator.mozSettings;
    this.bluetooth = navigator.mozBluetooth;
    this.nfc = navigator.mozNfc;

    if (this.bluetooth.enabled) {
      this.debug('Bluetooth already enabled on boot');
      var req = this.bluetooth.getDefaultAdapter();
      req.onsuccess = function bt_getAdapterSuccess() {
        self.defaultAdapter = req.result;
        self.debug('MAC address: ' + self.defaultAdapter.address);
        self.debug('MAC name: ' + self.defaultAdapter.name);
      };
    }

    window.addEventListener('bluetooth-adapter-added', function() {
      self.debug('bluetooth-adapter-added');
      var req = self.bluetooth.getDefaultAdapter();
      req.onsuccess = function bt_getAdapterSuccess() {
        self.settingsNotified = false;
        self.defaultAdapter = req.result;
        self.debug('MAC address: ' + self.defaultAdapter.address);
        self.debug('MAC name: ' + self.defaultAdapter.name);
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
    });

    window.navigator.mozSetMessageHandler('nfc-manager-send-file',
      function(msg) {
        self.debug('In New event nfc-manager-send-file' + JSON.stringify(msg));
        self.handleFileTransfer(msg.sessionToken, msg.blob, msg.requestId);
    });
  },

  /*****************************************************************************
   *****************************************************************************
   * Private helper functions
   *****************************************************************************
   ****************************************************************************/

  saveBluetoothStatus: function saveBluetoothStatus() {
    if (!this.bluetoothStatusSaved) {
      this.bluetoothStatusSaved = true;
      this.bluetoothAutoEnabled = !this.bluetooth.enabled;
    }
  },

  restoreBluetoothStatus: function restoreBluetoothStatus() {
    if (!this.isHandoverInProgress() &&
        BluetoothTransfer.isSendFileQueueEmpty()) {
      if (this.bluetoothAutoEnabled) {
        this.debug('Disabling Bluetooth');
        this.settings.createLock().set({'bluetooth.enabled': false});
        this.bluetoothAutoEnabled = false;
      }
      this.bluetoothStatusSaved = false;
    }
  },

  /*
   * Performs an action once Bluetooth is enabled. If Bluetooth is disabled,
   * it is enabled and the action is queued. If Bluetooth is already enabled,
   * performs the action directly.
   */
  doAction: function doAction(action) {
    if (!this.bluetooth.enabled) {
      this.debug('Bluetooth: not yet enabled');
      this.actionQueue.push(action);
      if (this.settingsNotified === false) {
        this.settings.createLock().set({'bluetooth.enabled': true});
        this.settingsNotified = true;
      }
    } else {
      action.callback.apply(this, action.args);
    }
  },

  getBluetoothSSP: function getBluetoothSSP(ndef) {
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

  doPairing: function doPairing(mac) {
    this.debug('doPairing: ' + mac);
    if (this.defaultAdapter == null) {
      // No BT
      this.debug('No defaultAdapter');
      return;
    }
    var req = this.defaultAdapter.pair(mac);
    var self = this;
    req.onsuccess = function() {
      self.debug('Pairing succeeded');
      self.doConnect(mac);
    };
    req.onerror = function() {
      self.debug('Pairing failed');
    };
  },

  doFileTransfer: function doFileTransfer(mac) {
    this.debug('doFileTransfer');
    if (this.sendFileQueue.length === 0) {
      // Nothing to do
      this.debug('sendFileQueue empty');
      return;
    }
    this.debug('Send blob to ' + mac);
    var blob = this.sendFileQueue[0].blob;
    BluetoothTransfer.sendFileViaHandover(mac, blob);
  },

  doHandoverRequest: function doHandoverRequest(ndef, session) {
    this.debug('doHandoverRequest');
    if (this.getBluetoothSSP(ndef) == null) {
      /*
       * The handover request didn't contain a valid MAC address. Simply
       * ignore the request.
       */
      return;
    }

    var nfcPeer = this.nfc.getNFCPeer(session);
    var carrierPowerState = this.bluetooth.enabled ? 1 : 2;
    var mac = this.defaultAdapter.address;
    var hs = NDEFUtils.encodeHandoverSelect(mac, carrierPowerState);
    var req = nfcPeer.sendNDEF(hs);
    var self = this;
    req.onsuccess = function() {
      self.debug('sendNDEF(hs) succeeded');
      self.incomingFileTransferInProgress = true;
    };
    req.onerror = function() {
      self.debug('sendNDEF(hs) failed');
      self.restoreBluetoothStatus();
    };
  },

  initiateFileTransfer:
    function initiateFileTransfer(session, blob, requestId) {
      /*
       * Initiate a file transfer by sending a Handover Request to the
       * remote device.
       */
      var self = this;
      var onsuccess = function() {
        self.dispatchSendFileStatus(0, requestId);
      };
      var onerror = function() {
        self.dispatchSendFileStatus(1, requestId);
      };
      var job = {session: session, blob: blob, requestId: requestId,
                 onsuccess: onsuccess, onerror: onerror};
      this.sendFileQueue.push(job);
      var nfcPeer = this.nfc.getNFCPeer(session);
      var carrierPowerState = this.bluetooth.enabled ? 1 : 2;
      var mac = this.defaultAdapter.address;
      var hr = NDEFUtils.encodeHandoverRequest(mac, carrierPowerState);
      var req = nfcPeer.sendNDEF(hr);
      req.onsuccess = function() {
        self.debug('sendNDEF(hr) succeeded');
      };
      req.onerror = function() {
        self.debug('sendNDEF(hr) failed');
        onerror();
        self.sendFileQueue.pop();
        self.restoreBluetoothStatus();
      };
  },

  doConnect: function doConnect(mac) {
    this.debug('doConnect with: ' + mac);
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
      self.debug('# devices: ' + devices.length);
      var successCb = function() { self.debug('Connect succeeded'); };
      var errorCb = function() { self.debug('Connect failed'); };
      for (var i = 0; i < devices.length; i++) {
        var device = devices[i];
        self.debug('Address: ' + device.address);
        self.debug('Connected: ' + device.connected);
        if (device.address.toLowerCase() == mac.toLowerCase()) {
              self.debug('Connecting to ' + mac);
              var r = self.defaultAdapter.connect(device);
              r.onsuccess = successCb;
              r.onerror = errorCb;
        }
      }
    };
    req.onerror = function() {
      self.debug('Cannot get paired devices from adapter.');
    };
  },

  dispatchSendFileStatus: function dispatchSendFileStatus(status, requestId) {
    this.debug('In dispatchSendFileStatus ' + status);
    window.navigator.mozNfc.notifySendFileStatus(status, requestId);
  },

  onRequestConnect: function onRequestConnect(btssp) {
    var self = this;
    var onconfirm = function() {
      self.debug('Connect confirmed');
      self.doAction({callback: self.doPairing, args: [btssp.mac]});
    };
    var onabort = function() {
      self.debug('Connect aborted');
    };
    if (!this.nfcConnectSystemDialog) {
      this.nfcConnectSystemDialog = new NfcConnectSystemDialog();
    }
    this.nfcConnectSystemDialog.show(btssp.localName, onconfirm, onabort);
  },


  /*****************************************************************************
   *****************************************************************************
   * Handover API
   *****************************************************************************
   ****************************************************************************/

  handleSimplifiedPairingRecord: function handleSimplifiedPairingRecord(ndef) {
    this.debug('handleSimplifiedPairingRecord');
    var pairingRecord = ndef[0];
    var btssp = NDEFUtils.parseBluetoothSSP(pairingRecord);
    this.debug('Simplified pairing with: ' + btssp.mac);
    this.onRequestConnect(btssp);
  },

  handleHandoverSelect: function handleHandoverSelect(ndef) {
    this.debug('handleHandoverSelect');
    var btssp = this.getBluetoothSSP(ndef);
    if (btssp == null) {
      return;
    }
    if (this.sendFileQueue.length !== 0) {
      // This is the response to a file transfer request (negotiated handover)
      this.doAction({callback: this.doFileTransfer, args: [btssp.mac]});
    } else {
      // This is a static handover
      this.onRequestConnect(btssp);
    }
  },

  handleHandoverRequest: function handleHandoverRequest(ndef, session) {
    this.debug('handleHandoverRequest');
    this.saveBluetoothStatus();
    this.doAction({callback: this.doHandoverRequest, args: [ndef, session]});
  },

  handleFileTransfer: function handleFileTransfer(session, blob, requestId) {
    this.debug('handleFileTransfer');
    this.saveBluetoothStatus();
    this.doAction({callback: this.initiateFileTransfer, args: [session, blob,
                                                               requestId]});
  },

  isHandoverInProgress: function isHandoverInProgress() {
    return (this.sendFileQueue.length !== 0) ||
           (this.incomingFileTransferInProgress === true);
  },

  transferComplete: function transferComplete(details) {
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
    this.restoreBluetoothStatus();
  }
};

NfcHandoverManager.init();
