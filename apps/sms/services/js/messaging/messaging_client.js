/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */


/* global bridge, EventDispatcher */

/* export MessagingClient */

'use strict';
(function(exports) {

const EVENTS = [
  'message-sending', 'message-failed-to-send', 'message-delivered',
  'message-read', 'message-sent', 'message-received', 'threads-deleted'
];

var client = bridge.client('messaging');

var MessagingClient = {
  relayEvents: function msc_relayEvents() {
    EVENTS.forEch((event) => {
      client.on(event, (item) => {
        this.emit(event, item);
      });
    });
  },

  getMessage: function msc_getMessage(id) {
    return client.method('getMessage', id);
  },

  retrieveMMS: function msc_retrieveMMS(id) {
    return client.method('retrieveMMS', id);
  },

  sendSMS: function msc_sendSMS(opts) {
    return client.method('sendSMS', opts);
  },

  sendMMS: function msc_sendMMS(opts) {
    return client.method('sendMMS', opts);
  },

  resendMessage: function msc_resendMessage(opts) {
    return client.method('resendMessage', opts);
  },

  deleteMessages: function msc_deleteMessages(id, callback) {
    return client.method('deleteMessages', id, callback);
  },

  markThreadRead: function msc_markThreadRead(threadId) {
    return client.method('markThreadRead', threadId);
  },

  markMessageRead: function msc_markMessageRead(list) {
    return client.method('markMessageRead', list);
  },

  getSegmentInfo: function msc_getSegmentInfo(text) {
    return client.method('getSegmentInfo', text);
  },

  findThreadFromNumber: function msc_findThreadFromNumber(number) {
    return client.method('findThreadFromNumber', number);
  },

  getThreads: function msc_getThreads(options) {
    var stream = client.stream('getThreadStream', options);

    stream.listen(function(thread) {
      if (!thread) {
        options.end();
        options.done();
        stream.close();
      }

      options.each(thread);
    });
  },

  getMessages: function msc_getMessages(options) {
    var stream = client.stream('getMessageStream', options);

    stream.listen(function(message) {
      if (!message) {
        options.end();
        options.done();
        stream.close();
      }

      options.each(message);
    });
  }
};

Object.defineProperty(exports, 'MessagingClient', {
  get: function () {
    delete exports.MessagingClient;

    exports.MessagingClient = EventDispatcher.mixin(MessagingClient, EVENTS);
    exports.MessagingClient.relayEvents();

    return exports.MessagingClient;
  },
  configurable: true,
  enumerable: true
});

})(window);
