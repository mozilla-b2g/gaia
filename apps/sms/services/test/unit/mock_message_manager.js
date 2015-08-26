/* global Promise */

/* exported MockMessageManager */
'use strict';

var MockMessageManager = {
  _message: null,
  init: () => {},
  getThreads: function() {},
  getMessages: function() {},
  getMessage: function() {
    this._message = {};
    return this._message;
  },
  deleteMessages: function(messageId, callback) {
    if (callback) {
      callback();
    }
  },
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
  off: function() {},
  mTriggerOnSuccess: function() {
    if (this._message.onsuccess) {
      this._message.onsuccess();
    }
  },
  mTriggerOnError: function() {
    if (this._message.onerror) {
      this._message.onerror();
    }
  }
};
