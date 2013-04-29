'use strict';

var MockMmiUI = {

  COMMS_APP_ORIGIN: 'http://communications.gaiamobile.org:8080',
  ready: true,
  _messageReceived: null,
  _sessionEnded: null,

  postMessage: function muui_postMessage(evt) {
    if (!evt.data) {
      return;
    }

    switch (evt.data.type) {
      case 'mmi-received-ui':
        this._messageReceived = evt.data.message;
        this._sessionEnded = evt.data.sessionEnded;
        break;
      case 'mmi-success':
        this._messageReceived = evt.data.result;
        this._sessionEnded = null;
        break;
      case 'mmi-error':
        this._messageReceived = evt.data.error;
        this._sessionEnded = null;
        break;
    }
  },

  reply: function muui_reply(message) {
    var evt = {
      type: 'message',
      data: {
        type: 'mmi-reply',
        message: message
      },
      origin: this.COMMS_APP_ORIGIN
    };
    MmiManager.handleEvent(evt);
  },

  closeWindow: function muui_closeWindow() {
    var evt = {
      type: 'message',
      data: {
        type: 'mmi-cancel'
      },
      origin: this.COMMS_APP_ORIGIN
    };
    MmiManager.handleEvent(evt);
  },

  cancel: function muui_cancel() {
    var evt = {
      type: 'message',
      data: {
        type: 'mmi-cancel'
      },
      origin: this.COMMS_APP_ORIGIN
    };
    MmiManager.handleEvent(evt);
  },

  close: function muui_close() {
    this.ready = false;
  },

  teardown: function mmui_mTeardown() {
    this._messageReceived = null;
  }
};
