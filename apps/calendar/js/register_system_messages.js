/**
 * - Event: 'alarm'
 * - Event: 'notification'
 * - Event: 'sync'
 */
Calendar.registerSystemMessages = function() {
  'use strict';

  var debug = Calendar.debug('messages');
  var emitter = new Calendar.Responder();

  if (!('mozSetMessageHandler' in navigator)) {
    return debug('Missing mozSetMessageHandler!');
  }

  navigator.mozSetMessageHandler('alarm', (message) => {
    var data = message.data;
    switch (data.type) {
      case 'sync':
        emitter.emit('sync');
        break;
      default:
        emitter.emit('alarm', data);
    }
  });

  return emitter;
};
