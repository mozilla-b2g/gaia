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
          result: [{}, {}]
        };
        // run asynchronous onsuccess callback
        setTimeout(function() {
          if (tmpObj.onsuccess) {
            tmpObj.onsuccess();
          }
        });
        return tmpObj;
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
        return {};
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
  }
};

MockBluetooth.init();
