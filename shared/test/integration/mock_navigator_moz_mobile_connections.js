/*global EventTarget */

(function() {
  'use strict';

  /**
   * Mock mozMobileConnection Object, accessible through mozMobileConnections
   */
  function MockMobileConnection() {
    this.iccId = 42;
  }
  MockMobileConnection.prototype = {
    __proto__: Object.create(EventTarget.prototype),
    __exposedProps__: {
      iccId: 'r'
    }
  };

  //var mockMobileConnections = new document.defaultView.Array({});

  /**
   * Mock for navigator.mozMobileConnections
   */
  var mockMobileConnections = [
    new MockMobileConnection(),
    new MockMobileConnection()
  ];

  /**
   * Mock mozIcc Obeject, return by mozIccManager.getIccById
   */
  function MockMozIcc() {
    this.cardState = 'ready';
  }
  MockMozIcc.prototype = {
    __proto__: Object.create(EventTarget.prototype),
    __exposedProps__: {
      cardstate: 'r',
      getCardLock: 'r',
      setCardLock: 'r',
      getCardLockRetryCount: 'r',
    },

    getCardLock: function() {},
    setCardLock: function() {},
    getCardLockRetryCount: function() {},
  };

  var _iccs = [
    new MockMozIcc(),
    new MockMozIcc()
  ];

  /**
   * Mock for navigator.mozIccManager
   */
  var mockIccManager = {
    __proto__: Object.create(EventTarget.prototype),
    __exposedProps__: {
      iccIds: 'r',
      getIccById: 'r'
    },
    iccIds: [0, 1],
    getIccById: function(id) {
      return _iccs[id];
    }
  };


  Object.defineProperty(window.wrappedJSObject.navigator,
  'mozMobileConnections', {
    configurable: false,
    get: function() {
      return mockMobileConnections;
    }
  });

  Object.defineProperty(window.wrappedJSObject.navigator, 'mozIccManager', {
    configurable: false,
    get: function() {
      return mockIccManager;
    }
  });

})();
