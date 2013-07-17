'use strict';

(function(window) {

var messageHandlers;

function mozSetMessageHandler(name, func) {
  if (!mozSetMessageHandler.mLock[name]) {
    messageHandlers[name] = func;
  }
}

mozSetMessageHandler.mSetup = mozSetMessageHandler.mTeardown =
  function msmh_setup() {
    messageHandlers = Object.create(null);

    mozSetMessageHandler.mLock = {};
  };

mozSetMessageHandler.mTrigger = function msmh_trigger(name, message) {
  if (typeof messageHandlers[name] === 'function') {
    messageHandlers[name](message);
  }
};

Object.defineProperty(mozSetMessageHandler, 'mMessageHandlers', {
  get: function msmh_getMessageHandlers() { return messageHandlers; },
  set: function msmh_setMessageHandlers(handlers) {
    messageHandlers = handlers;
  }
});

window.MockNavigatormozSetMessageHandler = mozSetMessageHandler;

})(window);
