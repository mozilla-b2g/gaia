/* exported MockMessageManager */
'use strict';

var MockMessageManager = {
  getThreads: function() {},
  getMessages: function() {},
  getMessage: function() {},
  deleteMessage: function(messageId, callback) {
    if (callback) {
      callback();
    }
  },
  onHashChange: function() {},
  launchComposer: function() {},
  handleActivity: function() {},
  handleForward: function() {},
  registerMessage: function() {},
  sendSMS: function() {
    return {};
  },
  sendMMS: function() {
    return {};
  },
  resendMessage: function() {},
  retrieveMMS: function() {},
  markMessagesRead: function() {},
  markThreadRead: function() {}
};
