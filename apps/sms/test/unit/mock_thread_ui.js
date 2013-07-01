'use strict';

var MockThreadUI = {
  isShowSendMessageErrorCalledTimes: 0,

  appendMessage: function() {
  },

  showSendMessageError: function() {
    this.isShowSendMessageErrorCalledTimes += 1;
  },

  mSetup: function() {
    this.isShowSendMessageErrorCalledTimes = 0;
  },

  mTeardown: function() {
    this.isShowSendMessageErrorCalledTimes = 0;
  }
};
