'use strict';

var MockUssdUI = {

  COMMS_APP_ORIGIN: 'http://communications.gaiamobile.org:8080',
  ready: true,
  _messageReceived: null,
  _sessionEnded: null,

  postMessage: function muui_postMessage(message, origin) {
    switch (message.type) {
      case 'ussdreceived':
        this._messageReceived = message.message;
        this._sessionEnded = message.sessionEnded;
        break;
      case 'success':
        this._messageReceived = message.result;
        this._sessionEnded = null;
        break;
      case 'error':
        this._messageReceived = message.error;
        this._sessionEnded = null;
        break;
    }
  },

  reply: function muui_reply(message) {
    var evt = {
      type: 'message',
      data: {
        type: 'reply',
        message: message
      },
      origin: this.COMMS_APP_ORIGIN
    };
    UssdManager.handleEvent(evt);
  },

  closeWindow: function muui_closeWindow() {
    var evt = {
      type: 'message',
      data: {
        type: 'close'
      },
      origin: this.COMMS_APP_ORIGIN
    };
    UssdManager.handleEvent(evt);
  },

  cancel: function muui_cancel() {
    var evt = {
      type: 'message',
      data: {
        type: 'cancel'
      },
      origin: this.COMMS_APP_ORIGIN
    };
    UssdManager.handleEvent(evt);
  },

  close: function muui_close() {
    this.ready = false;
  },

  teardown: function mmui_mTeardown() {
    this._messageReceived = null;
  }
};
