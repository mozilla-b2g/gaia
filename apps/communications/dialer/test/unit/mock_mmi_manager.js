'use strict';

var MockMmiManager = {
  init: function(cb) {
    if (typeof cb === 'function') {
      cb();
    }
  },
  send: function(message) {},
  notifySuccess: function(evt) {},
  notifyError: function(evt) {},
  openUI: function() {},
  handleMMIReceived: function(message, session, cardIndex) {},
  handleRequest: function(conn, message, request) {},
  sendNotification: function(message, cardIndex) {
    return { then: function(callback) { callback(); } };
  },
  handleEvent: function(evt) {},
  isImei: function() { return false; },
  showImei: function() {},
  cancel: function(){},
};

window.MockMmiManager = MockMmiManager;
