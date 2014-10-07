/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Bluetooth = {
  get Profiles() {
    return {
      HFP: 'hfp',   // Hands-Free Profile
      OPP: 'opp',   // Object Push Profile
      A2DP: 'a2dp', // A2DP status
      SCO: 'sco'    // Synchronous Connection-Oriented
    };
  },

  _setProfileConnected: function bt_setProfileConnected(profile, connected) {
    var value = this['_' + profile + 'Connected'];
    if (value != connected) {
      this['_' + profile + 'Connected'] = connected;

      // Raise an event for the profile connection changes.
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('bluetoothprofileconnectionchange',
        /* canBubble */ true, /* cancelable */ false,
        {
          name: profile,
          connected: connected
        });
      window.dispatchEvent(evt);
    }
  },

  getCurrentProfiles: function bt_getCurrentProfiles() {
    var profiles = this.Profiles;
    var connectedProfiles = [];
    for (var name in profiles) {
      var profile = profiles[name];
      if (this.isProfileConnected(profile)) {
        connectedProfiles.push(profile);
      }
    }
    return connectedProfiles;
  },

  isProfileConnected: function bt_isProfileConnected(profile) {
    var isConnected = this['_' + profile + 'Connected'];
    if (isConnected === undefined) {
      return false;
    } else {
      return isConnected;
    }
  },

  /* this property store a reference of the default adapter */
  defaultAdapter: null,

  /* keep a global connected property here */
  connected: false,

  init: function bt_init() {
    if (!window.navigator.mozSettings)
      return;

    if (!window.navigator.mozBluetooth)
      return;

    var telephony = window.navigator.mozTelephony;
    var bluetooth = window.navigator.mozBluetooth;
    var settings = window.navigator.mozSettings;
    var self = this;

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

    // when bluetooth adapter is ready, emit event to notify QuickSettings
    // and try to get defaultAdapter at this moment
    bluetooth.onadapteradded = function bt_onAdapterAdded() {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('bluetooth-adapter-added',
        /* canBubble */ true, /* cancelable */ false, null);
      window.dispatchEvent(evt);
      self.initDefaultAdapter();
    };
    // if bluetooth is enabled in booting time, try to get adapter now
    this.initDefaultAdapter();

    // when bluetooth is really disabled, emit event to notify QuickSettings
    bluetooth.ondisabled = function bt_onDisabled() {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('bluetooth-disabled',
        /* canBubble */ true, /* cancelable */ false, null);
      window.dispatchEvent(evt);
    };

    /* In file transfering case:
     * since System Message can't be listened in two js files within a app,
     * so we listen here but dispatch events to bluetooth_transfer.js
     * when getting bluetooth file transfer start/complete system messages
     */
    navigator.mozSetMessageHandler('bluetooth-opp-transfer-start',
      function bt_fileTransferUpdate(transferInfo) {
        self._setProfileConnected(self.Profiles.OPP, true);
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
        self._setProfileConnected(self.Profiles.OPP, false);
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
      self.initWithAdapter(self.defaultAdapter);
    };
  },

  initWithAdapter: function bt_initWithAdapter(adapter) {
    /* for v1, we only support two use cases for bluetooth connection:
     *   1. connecting with a headset
     *   2. transfering a file to/from another device
     * So we need to listen to corresponding events to know we are (aren't)
     * connected, then summarize to an event and dispatch to StatusBar
     */

    // In headset connected case:
    var self = this;
    adapter.onhfpstatuschanged = function bt_hfpStatusChanged(evt) {
      self._setProfileConnected(self.Profiles.HFP, evt.status);
      self.updateConnected();
    };

    adapter.ona2dpstatuschanged = function bt_a2dpStatusChanged(evt) {
      self._setProfileConnected(self.Profiles.A2DP, evt.status);
      self.updateConnected();
    };

    adapter.onscostatuschanged = function bt_scoStatusChanged(evt) {
      self._setProfileConnected(self.Profiles.SCO, evt.status);
    };
  },

  updateConnected: function bt_updateConnected() {
    var bluetooth = window.navigator.mozBluetooth;

    if (!bluetooth || !('isConnected' in bluetooth))
      return;

    var wasConnected = this.connected;
    this.connected = this.isProfileConnected(this.Profiles.HFP) ||
                     this.isProfileConnected(this.Profiles.A2DP) ||
                     this.isProfileConnected(this.Profiles.OPP);

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
