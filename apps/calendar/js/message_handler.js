define(function(require, exports, module) {
'use strict';

var Responder = require('responder');
var debug = require('debug')('message_handler');

// Will be injected...
exports.app = null;
var responder = exports.responder = new Responder();

if (!('mozSetMessageHandler' in navigator)) {
  debug('mozSetMessageHandler is missing!');
  return;
}

debug('Will listen for alarm messages...');
navigator.mozSetMessageHandler('alarm', message => {
  debug('Received alarm message!');
  var data = message.data;
  switch (data.type) {
    case 'sync':
      responder.emit('sync');
      break;
    default:
      responder.emit('alarm', data);
      break;
  }
});

navigator.mozSetMessageHandler('notification', message => {
  debug('Received notification message!');
  // Handle notifications when the calendar app process is closed.
  if (!message.clicked) {
    return debug('Notification was not clicked?');
  }

  navigator.mozApps.getSelf().onsuccess = (event) => {
    var app = event.target.result;
    var url = message.imageURL.split('?')[1];

    window.addEventListener('moz-app-loaded', () => {
      debug('App is loaded. Notification will now redirect to:', url);
      exports.app.go(url);
    });

    app.launch();
  };
});

});
