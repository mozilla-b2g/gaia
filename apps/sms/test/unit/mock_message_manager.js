'use strict';

var MockMessageManager = {
  getMessages: function() {},
  deleteMessage: function() {},
  sendSMS: function() {
    return {};
  },
  sendMMS: function() {
    return {};
  }
};

MockMessageManager.mSetup = function() {
  sinon.spy(MockMessageManager, 'sendSMS');
  sinon.spy(MockMessageManager, 'sendMMS');

  MockMessageManager.activity = {
    body: null,
    number: null,
    contact: null,
    recipients: null,
    threadId: null,
    isLocked: false
  };
};

MockMessageManager.mTeardown = function() {
  MockMessageManager.sendSMS.restore();
  MockMessageManager.sendMMS.restore();
};
