define(function(require, exports, module) {
'use strict';

var Responder = require('common/responder');
var debug = require('common/debug')('message_handler');
var notification = require('notification');

var responder = exports.responder = new Responder();

exports.start = function() {
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
        responder.emitWhenListener('sync');
        break;
      default:
        responder.emitWhenListener('alarm', data);
        break;
    }
  });

  // Handle notifications when the calendar app process is closed.
  debug('Will listen for notification messages...');
  navigator.mozSetMessageHandler('notification', message => {
    debug('Received notification message!');
    if (!message.clicked) {
      return debug('Notification was not clicked?');
    }

    var url = message.imageURL.split('?')[1];
    notification.launch(url);
  });
};

});
