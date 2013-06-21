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
      timestamp: Date.now(),
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
    // default mms message
    var message = {
      id: 1,
      threadId: 1,
      sender: 'sender',
      receivers: ['receiver'],
      delivery: 'received',
      type: 'mms',
      timestamp: Date.now(),
      read: true,
      subject: '',
      smil: null,
      attachments: [new Blob(['body'], {type: 'text/plain'})],
      expiryDate: Date.now()
    };

    for (var key in message) {
      if (opts.hasOwnProperty(key)) {
        message[key] = opts[key];
      }
    }

    return message;
  }
};
