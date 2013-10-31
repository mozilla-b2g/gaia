/*exported MockMessages */

'use strict';

var MockMessages = {
  sms: function(opts = {}) {
    // default sms message
    var message = {
      id: 1,
      threadId: 1,
      sender: 'sender',
      receiver: 'receiver',
      body: 'body',
      delivery: 'received',
      type: 'sms',
      messageClass: 'normal',
      timestamp: new Date(),
      read: true
    };

    for (var key in message) {
      if (opts.hasOwnProperty(key)) {
        message[key] = opts[key];
      }
    }

    return message;
  },

  mms: function(opts = {}) {
    var now = new Date();
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // default mms message
    var message = {
      id: 1,
      threadId: 1,
      sender: 'sender',
      receivers: ['receiver'],
      delivery: 'received',
      type: 'mms',
      timestamp: now,
      read: true,
      subject: '',
      smil: null,
      attachments: [new Blob(['body'], {type: 'text/plain'})],
      expiryDate: tomorrow
    };

    for (var key in message) {
      if (opts.hasOwnProperty(key)) {
        message[key] = opts[key];
      }
    }

    return message;
  }
};
