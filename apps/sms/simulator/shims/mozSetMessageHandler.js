'use strict';

(function(exports) {

var messageHandlers = {};

function teardown(window) {
  console.log('Shims.mozSetMessageHandler: resetting handlers');
  messageHandlers = {};
}

function ourSetMessageHandler(eventName, callback) {
  messageHandlers[eventName] = messageHandlers[eventName] || [];
  messageHandlers[eventName].push(callback);

  console.log('setMessageHandler: added callback for event', eventName);
}

function injectTo(fwindow) {
  fwindow.navigator.mozSetMessageHandler = ourSetMessageHandler;
}

function trigger(eventName) {
  var handlers = messageHandlers[eventName];
  if (!handlers) {
    return;
  }

  var args = Array.slice(arguments, 1);
  handlers.forEach(function(handler) {
    handler.apply(null, args);
  });
}

exports.Shims.contribute(
  'mozSetMessageHandler',
  {
    injectTo: injectTo,
    teardown: teardown,
    trigger: trigger
  }
);

})(window);
