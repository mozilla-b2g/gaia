'use strict';

(function() {

  var DeviceStorage = {
    _listeners: {},
    _freeSpace: 0,

    freeSpace: function freeSpace() {
      var request = {};

      setTimeout((function nextTick() {
        if (request.onsuccess) {
          request.result = this._freeSpace;
          request.onsuccess();
        }
      }).bind(this));

      return request;
    },

    addEventListener: function addEventListener(event, listener) {
      this._listeners[event] = listener;
    }
  };

  function mockGetDeviceStorage() {
    return DeviceStorage;
  }

  window.MockNavigatorGetDeviceStorage = mockGetDeviceStorage;
})();
