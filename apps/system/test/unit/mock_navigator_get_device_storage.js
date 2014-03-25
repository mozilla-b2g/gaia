'use strict';

/* global MockDOMRequest */

(function() {
  /**
   * This file implements a partly completed MockDeviceStorage.
   * Many of it's method returns a MockDOMRequest(). You should install a
   * sinon.spy on the method and retrive the MockDOMRequest instance with
   * 'spy.getCall(0).returnValue'.
   *
   * Check out 'apps/system/test/unit/screenshot_test.js' for example.
   *
   * @type {Object}
   */
  var MockDeviceStorage = {
    _listeners: {},

    freeSpace: function freeSpace() {
      return new MockDOMRequest();
    },

    available: function available() {
      return new MockDOMRequest();
    },

    addNamed: function addNamed(file, filename) {
      return new MockDOMRequest();
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
