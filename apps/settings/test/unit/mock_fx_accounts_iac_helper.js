/* exported MockFxAccountsIACHelper */

'use strict';

var MockFxAccountsIACHelper = (function() {
  var listeners = {
    'onlogin': [],
    'onverified': [],
    'onlogout': []
  };

  var currentState = null;

  function getAccount(cb) {
    cb(currentState);
  }

  function resendVerificationEmail(email, cb) {
    cb();
  }

  function resetListeners() {
    listeners.onlogin = [];
    listeners.onverified = [];
    listeners.onlogout = [];
  }

  function addEventListener(eventType, cb) {
    if (!(eventType in listeners)) {
      throw new Error('tried to add wrong event type');
    }
    listeners[eventType].push(cb);
  }

  function removeEventListener(eventType, cb) {
    if (!(eventType in listeners)) {
      throw new Error('tried to remove wrong event type');
    }
    for (var i = 0; i < listeners[eventType].length; i++) {
      if (cb == listeners[eventType][i]) {
        listeners[eventType].splice(i, 1);
      }
    }
  }

  function fireEvent(eventType) {
    if (!(eventType in listeners)) {
      throw new Error('tried to fire wrong event type');
    }

    for (var i = 0; i < listeners[eventType].length; i++) {
      listeners[eventType][i](eventType);
    }
  }

  function setCurrentState(x) {
    currentState = x;
  }

  function getCurrentState() {
    return currentState;
  }

  return {
    getAccount: getAccount,
    resendVerificationEmail: resendVerificationEmail,
    setCurrentState: setCurrentState,
    getCurrentState: getCurrentState,
    addEventListener: addEventListener,
    removeEventListener: removeEventListener,
    fireEvent: fireEvent,
    listeners: listeners,
    resetListeners: resetListeners
  };
})();
