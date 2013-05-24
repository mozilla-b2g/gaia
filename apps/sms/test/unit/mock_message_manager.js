'use strict';

var MockMessageManager = {
  getMessages: function() {},
  deleteMessage: function() {},
  mSetup: function() {
    this.activity = {
      body: null,
      number: null,
      contact: null,
      recipients: null,
      threadId: null,
      isLocked: false
    };
  }
};
