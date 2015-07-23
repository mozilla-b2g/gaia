(function (exports) {
  'use strict';
  exports.BluetoothLoader = {
    // on b2g-desktop, we don't have mozBluetooth API, so we inject fake one
    // just to make sure we won't break TV build on b2g-desktop
    _fakeMozBluetooth: {
      addEventListener: function() {},
      defaultAdapter: {
        _discoveryHandle: {
          addEventListener: function() {}
        },

        state: 'disabled',
        enable: function() {
          return Promise.resolve();
        },
        disable: function() {
          return Promise.resolve();
        },
        startDiscovery: function() {
          return Promise.resolve(this._discoveryHandle);
        },
        stopDiscovery: function() {
          return Promise.resolve();
        }
      }
    },

    getMozBluetooth: function() {
      if (navigator.mozBluetooth) {
        return navigator.mozBluetooth;
      } else {
        return this._fakeMozBluetooth;
      }
    }
  };

}(window));
