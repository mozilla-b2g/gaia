'use strict';

var MockThreadUI = {
  recipients: null,
  recipientsList: document.createElement('div'),

  initRecipients: function() {
    this.recipients = new Recipients({
      outer: 'messages-to-field',
      inner: 'messages-recipients-list',
      template: new Utils.Template('messages-recipient-tmpl')
    });
  },

  cleanFields: function() {
  },

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
