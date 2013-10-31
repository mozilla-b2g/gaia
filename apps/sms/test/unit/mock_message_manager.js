'use strict';

var MockMessageManager = {
  getMessages: function() {},
  getMessage: function() {},
  deleteMessage: function(messageId, callback) {
    if (callback) {
      callback();
    }
  },
  onHashChange: function() {},
  launchComposer: function() {},
  sendSMS: function() {
    return {};
  },
  sendMMS: function() {
    return {};
  },
  markMessagesRead: function() {},
  markThreadRead: function() {}
};

MockMessageManager.mSetup = function() {
  sinon.spy(MockMessageManager, 'sendSMS');
  sinon.spy(MockMessageManager, 'sendMMS');

  MockMessageManager.activity = null;
};

MockMessageManager.mTeardown = function() {
  MockMessageManager.sendSMS.restore();
  MockMessageManager.sendMMS.restore();
};
