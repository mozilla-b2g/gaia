'use strict';

/* global MockDOMRequest */

var MockBluetooth = {
  defaultAdapter: null,
  enabled: true,
  init: function mbt_init() {
    var mockAdapater = {
      getPairedDevices: function mbta_getPairedDevices() {
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
      }
    };
    this.defaultAdapter = mockAdapater;
  },

  getAdapter: function mbt_getAdapter() {
    return this.defaultAdapter;
  },

  getDefaultAdapter: function mbt_getDefaultAdapter() {
    return this.defaultAdapter;
  }
};

MockBluetooth.init();
