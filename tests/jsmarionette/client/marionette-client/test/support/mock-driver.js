/* global Marionette */
(function(module) {
  'use strict';

  function MockDriver() {
    this.sent = [];
    this.queue = [];
    this.timeout = 0;
  }

  MockDriver.prototype = {

    connectionId: 0,

    setScriptTimeout: function(timeout) {
      this.timeout = timeout;
    },

    reset: function() {
      this.sent.length = 0;
      this.queue.length = 0;
    },

    send: function(cmd, cb) {
      this.sent.push(cmd);
      this.queue.push(cb);
    },

    respond: function(cmd) {
      if (this.queue.length) {
        (this.queue.shift())(cmd);
      }
    }
  };

  module.exports = MockDriver;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('support/mock-driver'), Marionette] :
    [module, require('../../lib/marionette/marionette')]
));
