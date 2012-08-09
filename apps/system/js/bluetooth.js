/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Bluetooth = {

  /* this property store a reference of the default adapter */
  defaultAdapter: null,

  /* this property store the array of paired devices we got from the
   * adapter */
  pairedDevices: [],

  /* keep a global connected property here */
  connected: false,

  init: function bt_init() {
    var settings = window.navigator.mozSettings;
    if (!settings)
      return;

    var bluetooth = window.navigator.mozBluetooth;
    var self = this;

    // Sync the bluetooth.enabled mozSettings value with real API
    // These code should be removed once this bug is fixed
    // https://bugzilla.mozilla.org/show_bug.cgi?id=777665
    SettingsListener.observe('bluetooth.enabled', true, function(value) {
      if (!bluetooth) {
        // roll back the setting value to notify the UIs
        // that Bluetooth interface is not available
        if (value) {
          settings.getLock().set({
            'bluetooth.enabled': false
          });
        }

        return;
      }

      if (bluetooth.enabled == value)
        return;

      var req = bluetooth.setEnabled(value);
      req.onerror = function bt_enabledError() {
        // roll back the setting value to notify the UIs
        // that bluetooth has failed to enable.
        settings.getLock().set({
          'bluetooth.enabled': !value
        });
      };
    });

    if (bluetooth && bluetooth.getDefaultAdapter) {
      var req = bluetooth.getDefaultAdapter();
      req.onsuccess = function bt_gotDefaultAdapter(evt) {
        var adapter =
          self.defaultAdapter = evt.result;

        /* If we get adapter.ondeviceconnected and
        adapter.ondevicedisconnected, we can end here. But we don't..
        https://bugzilla.mozilla.org/show_bug.cgi?id=778640
        */

        adapter.ondevicefound = self.updateDeviceList.bind(self);

        // We might have this callback or |device.ondisappeared|
        // put it here anyway.
        adapter.ondevicedisappeared = self.updateDeviceList.bind(self);

        self.updateDeviceList.call(self);
      };
    }
  },

  updateDeviceList: function bt_updateDeviceList() {
    var adapter = this.defaultAdapter;

    // adapter.getPairedDevices will be implemented in
    // https://bugzilla.mozilla.org/show_bug.cgi?id=777671
    if (!adapter.getPairedDevices)
      return;

    var self = this;
    var req = adapter.getPairedDevices();
    req.onsuccess = function bt_gotPairedDevices(evt) {
      var devices =
        self.pairedDevices = evt.result;

      devices.forEach(function(device) {
        device.onpropertychanged =
          self.updateConnected.bind(self);

        // We might have this callback or |adapter.ondevicedisappeared|
        // put it here anyway.
        device.ondisappeared =
          self.updateDeviceList.bind(self);
      });

      self.updateConnected.call(self);
    }
  },

  updateConnected: function bt_updateConnected() {
    var wasConnected = this.connected;
    this.connected = this.pairedDevices.some(function(device) {
      return device.connected;
    });

    if (wasConnected !== this.connected) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('bluetoothconnectionchange',
        /* canBubble */ true, /* cancelable */ false,
        {deviceConnected: this.connected});
      window.dispatchEvent(evt);
    }
  }
};

Bluetooth.init();
