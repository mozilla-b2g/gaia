'use strict';

/* global MockDOMRequest */

var MockBluetooth = {
  get Profiles() {
    return {
      HFP: 'hfp',   // Hands-Free Profile
      OPP: 'opp',   // Object Push Profile
      A2DP: 'a2dp', // A2DP status
      SCO: 'sco'    // Synchronous Connection-Oriented
    };
  },
  defaultAdapter: null,
  connected: false,
  enabled: true,
  mExpectedProfile: null,
  init: function mbt_init() {
    var mockAdapater = {
      address: '01:23:45:67:89:AB',
      name: 'MockBTDevice',
      getPairedDevices: function mbt_getPairedDevices() {
        // fake object with two paired devices
        var tmpObj = {
          result: [{ address: '01:01:01:02:02:02' },
                   { address: '03:03:03:04:04:04' }]
        };
        // run asynchronous onsuccess callback
        setTimeout(function() {
          if (tmpObj.onsuccess) {
            tmpObj.onsuccess();
          }
        });
        return tmpObj;
      },
      getConnectedDevices: function mbt_getConnectedDevices() {
        return new MockDOMRequest();
      },
      confirmReceivingFile:
      function mbta_confirmReceivingFile(deviceAddress, flag) {
        return new MockDOMRequest();
      },
      sendFile: function mbta_sendFile(deviceAddress, file) {
        return new MockDOMRequest();
      },
      stopSendingFile: function mbta_stopSendingFile(deviceAddress) {
        return new MockDOMRequest();
      },
      pair: function() {
        return new MockDOMRequest();
      },
      connect: function() {
        return new MockDOMRequest();
      }
    };
    this.defaultAdapter = mockAdapater;
  },

  getAdapter: function mbt_getAdapter() {
    return this.defaultAdapter;
  },

  getDefaultAdapter: function mbt_getDefaultAdapter() {
    return new MockDOMRequest();
  },

  isProfileConnected: function mbt_isProfileConnected(profile) {
    return this.mExpectedProfile === profile;
  },

  get isEnabled() {
    return this.enabled;
  }
};

MockBluetooth.init();
