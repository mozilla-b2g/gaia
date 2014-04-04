'use strict';

var MockIACPort = {
  _name: null,

  _messages: [],

  _reset: function() {
    this._messages = [];
    this._name = null;
  },

  postMessage: function(msg) {
    this._messages.push(msg);
  }
};

var MockIACHandler = {
  getPort: function(portName) {
    MockIACPort._reset();
    MockIACPort._name = portName;
    return MockIACPort;
  }
};

