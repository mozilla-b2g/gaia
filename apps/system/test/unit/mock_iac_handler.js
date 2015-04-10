'use strict';
/* exported MockIACHandler */

var MockIACPort = {
  _name: null,

  _messages: [],

  _reset: function() {
    this._messages = [];
    this._name = null;
  },

  postMessage: function(msg) {
    this._messages.push(msg);
  },

  mTearDown: function() {
    this._name = null;
    this._messages = [];
  },

  mNumberOfMessages: function() {
    return this._messages.length;
  }
};

var MockIACHandler = {
  getPort: function(portName) {
    MockIACPort._reset();
    MockIACPort._name = portName;
    return MockIACPort;
  }
};

