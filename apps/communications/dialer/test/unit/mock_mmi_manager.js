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
  sendNotification: function(message, cardIndex) {
    return { then: function(callback) { callback(); } };
  },
  isMMI: function(number) {
    return false;
  },
  handleEvent: function(evt) {

  },
  showImei: function() {

  }
};

window.MockMmiManager = MockMmiManager;
