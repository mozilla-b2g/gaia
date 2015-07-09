/* global Promise */

/* exported MockMessageManager */
'use strict';

var MockMessageManager = {
  _message: null,
  init: () => {},
  getThreads: function() {},
  getMessages: function() {},
  getMessage: () => {},
  deleteMessages: () => Promise.resolve(),
  sendSMS: function() {
    return {};
  },
  sendMMS: function() {
    return {};
  },
  resendMessage: function() {},
  retrieveMMS: function() {},
  markMessagesRead: function() {},
  markThreadRead: function() {},
  findThreadFromNumber: function() {},
  getSegmentInfo: function() {
    return Promise.reject(new Error('not implemented '));
  },
  ensureThreadRegistered() { return Promise.resolve(); },
  on: function() {},
  off: function() {}
};
