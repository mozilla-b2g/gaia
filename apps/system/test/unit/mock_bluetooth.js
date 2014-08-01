'use strict';

/* global MockDOMRequest */

var MockBluetooth = {
  defaultAdapter: null,
  enabled: true,
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
      }
    };
    this.defaultAdapter = mockAdapater;
  },

  getAdapter: function mbt_getAdapter() {
    return this.defaultAdapter;
  },

  getDefaultAdapter: function mbt_getDefaultAdapter() {
    return new MockDOMRequest();
  }
};

MockBluetooth.init();
