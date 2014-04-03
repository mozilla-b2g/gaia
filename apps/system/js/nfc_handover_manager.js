/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc. */

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

  settings: window.navigator.mozSettings,
  bluetooth: window.navigator.mozBluetooth,
  nfc: window.navigator.mozNfc,

  defaultAdapter: null,

  /*
   * actionQueue keeps a list of actions that need to be performed after
   * Bluetooth is turned on.
   */
  actionQueue: new Array(),

  /*
   * sendFileRequest is set whenever an app called peer.sendFile(blob).
   * It will be inspected in the handling of Handover Select messages
   * to distinguish between static and negotiated handovers.
   */
  sendFileRequest: null,

  /*
   * incomingFileTransferInProgress is set to true during a file transfer
   * that was initiated by another device.
   */
  incomingFileTransferInProgress: false,

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
        self.actionQueue = new Array();
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

  /*
   * Performs an action once Bluetooth is enabled. If Bluetooth is disabled,
   * it is enabled and the action is queued. If Bluetooth is already enabled,
   * performs the action directly.
   */
  doAction: function doAction(action) {
    if (!this.bluetooth.enabled) {
      this.debug('Bluetooth: not yet enabled');
      this.actionQueue.push(action);
      if (this.settingsNotified == false) {
        this.settings.createLock().set({'bluetooth.enabled': true});
        this.settingsNotified = true;
      }
    } else {
      action.callback.apply(this, action.args);
    }
  },

  getBluetoothMAC: function getBluetoothMAC(ndef) {
    var handover = NfcManagerUtils.parseHandoverNDEF(ndef);
    if (handover == null) {
      // Bad handover message. Just ignore.
      this.debug('Bad handover messsage');
      return null;
    }
    var btsspRecord = NfcManagerUtils.searchForBluetoothAC(handover);
    if (btsspRecord == null) {
      // There is no Bluetooth Alternative Carrier record in the
      // Handover Select message. Since we cannot handle WiFi Direct,
      // just ignore.
      this.debug('No BT AC');
      return null;
    }
    var btssp = NfcManagerUtils.parseBluetoothSSP(btsspRecord);
    return btssp.mac;
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
    if (this.sendFileRequest == null) {
      // Nothing to do
      this.debug('No pending sendFileRequest');
      return;
    }
    this.debug('Send blob to ' + mac);
    var blob = this.sendFileRequest.blob;
    BluetoothTransfer.sendFile(mac, blob);
  },

  doHandoverRequest: function doHandoverRequest(ndef, session) {
    this.debug('doHandoverRequest');
    if (this.getBluetoothMAC(ndef) == null) {
      /*
       * The handover request didn't contain a valid MAC address. Simply
       * ignore the request.
       */
      return;
    }

    this.remoteMAC = mac;
    var nfcPeer = this.nfc.getNFCPeer(session);
    var carrierPowerState = this.bluetooth.enabled ? 1 : 2;
    var mac = this.defaultAdapter.address;
    var hs = NfcUtils.encodeHandoverSelect(mac, carrierPowerState);
    var req = nfcPeer.sendNDEF(hs);
    var self = this;
    req.onsuccess = function() {
      self.debug('sendNDEF(hs) succeeded');
      self.incomingFileTransferInProgress = true;
    };
    req.onerror = function() {
      self.debug('sendNDEF(hs) failed');
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
        self.dispatchSendFileStatus(0);
      };
      var onerror = function() {
        self.dispatchSendFileStatus(1);
      };
      this.sendFileRequest = {session: session, blob: blob,
                              requestId: requestId,
                              onsuccess: onsuccess, onerror: onerror};
      var nfcPeer = this.nfc.getNFCPeer(session);
      var carrierPowerState = this.bluetooth.enabled ? 1 : 2;
      var rnd = Math.floor(Math.random() * 0xffff);
      var mac = this.defaultAdapter.address;
      var hr = NfcManagerUtils.encodeHandoverRequest(mac, carrierPowerState,
                                                    rnd);
      var req = nfcPeer.sendNDEF(hr);
      req.onsuccess = function() {
        self.debug('sendNDEF(hr) succeeded');
      };
      req.onerror = function() {
        self.debug('sendNDEF(hr) failed');
        onerror();
        self.sendFileRequest = null;
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
      for (var i = 0; i < devices.length; i++) {
        var device = devices[i];
        self.debug('Address: ' + device.address);
        self.debug('Connected: ' + device.connected);
        if (device.address.toLowerCase() == mac.toLowerCase()) {
              self.debug('Connecting to ' + mac);
              var r = self.defaultAdapter.connect(device);
              r.onsuccess = function() { self.debug('Connect succeeded'); };
              r.onerror = function() { self.debug('Connect failed'); };
        }
      }
    };
    req.onerror = function() {
      self.debug('Cannot get paired devices from adapter.');
    };
  },

  dispatchSendFileStatus: function dispatchSendFileStatus(status) {
    this.debug('In dispatchSendFileStatus ' + status);
    window.navigator.mozNfc.notifySendFileStatus(status,
                         this.sendFileRequest.requestId);
  },

  /*****************************************************************************
   *****************************************************************************
   * Handover API
   *****************************************************************************
   ****************************************************************************/

  handleHandoverSelect: function handleHandoverSelect(ndef) {
    this.debug('handleHandoverSelect');
    var mac = this.getBluetoothMAC(ndef);
    var self = this;

    if (mac == null) {
      return;
    }
    if (this.sendFileRequest != null) {
      // This is the response to a file transfer request (negotiated handover)
      this.doAction({callback: this.doFileTransfer, args: [mac]});
    } else {
      // This is a static handover
      this.debug('Pair with: ' + mac);
      var onsuccess = function() { self.debug('Pairing succeeded'); };
      var onerror = function() { self.debug('Pairing failed'); };
      this.doAction({callback: this.doPairing,
                     args: [mac, onsuccess, onerror]});
    }
  },

  handleHandoverRequest: function handleHandoverRequest(ndef, session) {
    this.debug('handleHandoverRequest');
    this.doAction({callback: this.doHandoverRequest, args: [ndef, session]});
  },

  handleFileTransfer: function handleFileTransfer(session, blob, requestId) {
    this.debug('handleFileTransfer');
    this.doAction({callback: this.initiateFileTransfer, args: [session, blob,
                                                               requestId]});
  },

  isHandoverInProgress: function isHandoverInProgress() {
    return (this.sendFileRequest != null) ||
           (this.incomingFileTransferInProgress == true);
  },

  transferComplete: function transferComplete(succeeded) {
    this.debug('transferComplete');
    if (this.sendFileRequest != null) {
      // Completed an outgoing send file request. Call onsuccess/onerror
      if (succeeded == true) {
        this.sendFileRequest.onsuccess();
      } else {
        this.sendFileRequest.onerror();
      }
      this.sendFileRequest = null;
      this.incomingFileTransferInProgress = false;
    }
  }
};

NfcHandoverManager.init();
