'use strict';

var MockUssdUI = {

  _messageReceived: null,

  postMessage: function muui_postMessage(message) {
    this._messageReceived = message;
  },

  reply: function muui_reply(message) {
    var evt = {
      type: "message",
      data: {
        type: 'reply',
        message: message
      }
    };
    UssdManager.handleEvent(evt);
  },

  closeWindow: function muui_closeWindow() {
    var evt = {
      type: "message",
      data: {
        type: 'close'
      }
    };
    UssdManager.handleEvent(evt);
  },

  teardown: function mmui_mTeardown() {
    this._messageReceived = null;
  }
};