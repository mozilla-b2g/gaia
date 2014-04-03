'use strict';

var MockMmiManager = {
  init: function(cb) {
    if (typeof cb === 'function') {
      cb();
    }
  },
  send: function(message) {

  },
  notifySuccess: function(evt) {

  },
  notifyError: function(evt) {

  },
  openUI: function() {

  },
  handleMMIReceived: function(message, sessionEnded) {

  },
  isMMI: function(number) {
    return false;
  },
  handleEvent: function(evt) {

  }
};

window.MockMmiManager = MockMmiManager;
