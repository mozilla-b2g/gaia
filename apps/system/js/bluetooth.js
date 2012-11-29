/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Bluetooth = {

  /* this property store a reference of the default adapter */
  defaultAdapter: null,

  /* keep a global connected property here */
  connected: false,

  init: function bt_init() {
    if (!window.navigator.mozSettings)
      return;

    var bluetooth = window.navigator.mozBluetooth;

    SettingsListener.observe('bluetooth.enabled', true, function(value) {
      if (!bluetooth) {
        // roll back the setting value to notify the UIs
        // that Bluetooth interface is not available
        if (value) {
          SettingsListener.getSettingsLock().set({
            'bluetooth.enabled': false
          });
        }
        return;
      }
    });

    // when bluetooth adapter is ready, let get the default adapter.
    // and try to acquire default adapter when booting.
    bluetooth.onadapteradded = this.initDefaultAdapter.bind(this);
    this.initDefaultAdapter();

    /* for v1, we only support two use cases for bluetooth connection:
     *   1. connecting with a headset
     *   2. transfering a file to/from another device
     * So we need to monitor their event messages to know we are (aren't)
     * connected, then summarize to an event and dispatch to StatusBar
     */

    // In headset connected case:
    navigator.mozSetMessageHandler('bluetooth-hfp-status-changed',
      this.updateConnected.bind(this)
    );

    /* In file transfering case:
     * since System Message can't be listened in two js files within a app,
     * so we listen here but dispatch events to bluetooth_transfer.js
     * when getting bluetooth file transfer start/complete system messages
     */
    var self = this;
    navigator.mozSetMessageHandler('bluetooth-opp-transfer-start',
      function bt_fileTransferUpdate(transferInfo) {
        self.updateConnected();
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('bluetooth-opp-transfer-start',
          /* canBubble */ true, /* cancelable */ false,
          {transferInfo: transferInfo});
        window.dispatchEvent(evt);
      }
    );

    navigator.mozSetMessageHandler('bluetooth-opp-transfer-complete',
      function bt_fileTransferUpdate(transferInfo) {
        self.updateConnected();
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('bluetooth-opp-transfer-complete',
          /* canBubble */ true, /* cancelable */ false,
          {transferInfo: transferInfo});
        window.dispatchEvent(evt);
      }
    );

  },

  // Get adapter for BluetoothTransfer when everytime bluetooth is enabled
  initDefaultAdapter: function bt_initDefaultAdapter() {
    var bluetooth = window.navigator.mozBluetooth;
    var self = this;

    if (!bluetooth || !bluetooth.enabled ||
        !('getDefaultAdapter' in bluetooth))
      return;

    var req = bluetooth.getDefaultAdapter();
    req.onsuccess = function bt_gotDefaultAdapter(evt) {
      self.defaultAdapter = req.result;
    };
  },

  updateConnected: function bt_updateConnected() {
    var bluetooth = window.navigator.mozBluetooth;

    if (!bluetooth || !('isConnected' in bluetooth))
      return;

    var wasConnected = this.connected;
    this.connected =
      bluetooth.isConnected(0x111E) || bluetooth.isConnected(0x1105);

    if (wasConnected !== this.connected) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('bluetoothconnectionchange',
        /* canBubble */ true, /* cancelable */ false,
        {deviceConnected: this.connected});
      window.dispatchEvent(evt);
    }
  },

  // This function is called by external (BluetoothTransfer) for re-use adapter
  getAdapter: function bt_getAdapter() {
    return this.defaultAdapter;
  }
};

Bluetooth.init();
