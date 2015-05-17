/*exported MockMessages */

'use strict';

var MockMessages = {
  smilMockup: '<smil><head><layout>' +
    '<root-layout width="320px" height="480px"/>' +
    '<region id="Image" left="0px" top="0px" width="320px" ' +
    'height="320px" fit="meet"/><region id="Text" left="0px" ' +
    'top="320px" width="320px" height="160px" fit="meet"/>' +
    '</layout></head><body><par dur="5000ms"><img src="IMG_0011.jpg" ' +
    'region="Image"/></par></body></smil>',
  sms: function(opts = {}) {
    // default sms message
    var message = {
      id: 1,
      iccId: null,
      threadId: 1,
      sender: 'sender',
      receiver: 'receiver',
      body: 'body',
      delivery: 'received',
      deliveryStatus: 'success',
      deliveryTimestamp: Date.now(),
      type: 'sms',
      messageClass: 'normal',
      timestamp: Date.now(),
      sentTimestamp: Date.now(),
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
      iccId: null,
      threadId: 1,
      sender: 'sender',
      receivers: ['receiver'],
      delivery: 'received',
      deliveryInfo: [{
        receiver: 'receiver',
        deliveryStatus: 'success',
        readStatus: 'success',
        deliveryTimestamp: +now
      }],
      type: 'mms',
      timestamp: +now,
      sentTimestamp: +now,
      read: true,
      subject: '',
      smil: this.smilMockup,
      attachments: [{
        location: 'text1',
        content: new Blob(['This is a plain text'], { type: 'text/plain' })
      }],
      expiryDate: +tomorrow
    };

    for (var key in message) {
      if (opts.hasOwnProperty(key)) {
        message[key] = opts[key];
      }
    }

    return message;
  }
};
