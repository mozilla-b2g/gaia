'use strict';
var Promise = require('promise');

module.exports = function waitForEvent(listener, event) {
  return new Promise(function(accept, reject) {
    listener.on(event, function handler(message) {
      // accept the message before clearing the listener
      accept(message);
      listener.removeListener(event, handler);
    });
  });
};

