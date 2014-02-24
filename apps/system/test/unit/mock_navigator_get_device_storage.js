'use strict';

(function() {

  var MockDeviceStorage = {
    _listeners: {},
    _freeSpace: 0,
    _availableState: 'available',

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

    available: function available() {
      var request = {};

      setTimeout((function nextTick() {
        if (request.onsuccess) {
          request.result = this._availableState;
          request.onsuccess();
        }
      }).bind(this));

      return request;
    },

    addNamed: function addNamed(file, filename) {
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
    return MockDeviceStorage;
  }

  window.MockNavigatorGetDeviceStorage = mockGetDeviceStorage;
})();
