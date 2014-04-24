'use strict';

var MockNavigatorMozVoicemail = {
  mNumbers: ['111'],
  mHasMessages: false,
  mServiceId: 0,
  mCallbacks: {},
  mMessage: 'message',
  mMessageCount: 1,

  mTeardown: function() {
    this.numbers = ['111'];
    this.mHasMessages = false;
    this.mServiceId = 0;
    this.mCallbacks = {};
    this.mMessage = 'message';
    this.mMessageCount = 1;
  },

  mTriggerEvent: function(name) {
    this.mCallbacks[name].handleEvent({
      status: this.getStatus()
    });
  },

  getStatus: function() {
    return {
      serviceId: this.mServiceId,
      hasMessages: this.mHasMessages,
      messageCount: this.mMessageCount,
      returnMessage: this.mMessage
    };
  },

  addEventListener: function(name, callback) {
    this.mCallbacks[name] = callback;
    return;
  },

  getNumber: function(serviceId) {
    return this.mNumbers[serviceId || 0];
  }
};
