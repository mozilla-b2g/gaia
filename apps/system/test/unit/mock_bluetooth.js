'use strict';

var MockBluetooth = {
  defaultAdapter: null,
  init: function mbt_init() {
    var MockGetPairedDevices = {
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
      }
    };
    this.defaultAdapter = MockGetPairedDevices;
  },

  getAdapter: function mbt_getAdapter() {
    return this.defaultAdapter;
  }
};

MockBluetooth.init();
