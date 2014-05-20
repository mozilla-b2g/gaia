'use strict';

var MockBluetooth = {
  defaultAdapter: null,
  enabled: true,
  init: function mbt_init() {
    var MockGetPairedDevices = {
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
      pair: function() {
        return {};
      }
    };
    this.defaultAdapter = MockGetPairedDevices;
  },

  getAdapter: function mbt_getAdapter() {
    return this.defaultAdapter;
  },

  getDefaultAdapter: function mbt_getDefaultAdapter() {
    var req = {};

    setTimeout(function() {
      if (req.onsuccess) {
        req.result = MockBluetooth.defaultAdapter;
        req.onsuccess();
      }
    });

    return req;
  }
};

MockBluetooth.init();
