define(function(require, exports, module) {
'use strict';

var Responder = require('responder');

function MockStream() {
  Responder.call(this);

  this._queue = [];
  this._workingQueue = false;
}
module.exports = MockStream;

var emit = Responder.prototype.emit;

MockStream.prototype = {
  __proto__: Responder.prototype,

  emit: function() {
    var args = Array.prototype.slice.call(arguments);
    var self = this;

    this._queue.push(function() {
      emit.apply(self, args);
    });

    this._workQueue();
  },

  request: function(callback) {
    if (this._requestCallback) {
      throw new Error('request may only be called once.');
    }

    this._requestCallback = callback;
    if (this.mockonrequest) {
      this.mockonrequest();
    }
  },

  _workQueue: function() {
    if (!this._workingQueue && this._queue.length) {
      var self = this;
      var next = this._queue.shift();

      this._workingQueue = true;

      setTimeout(function() {
        next();
        self._workingQueue = false;
        self._workQueue();
      }, 0);
    }
  },

  close: function() {
    var self = this;

    this._queue.push(function() {
      self._requestCallback.apply(self, arguments);
    });

    this._workQueue();
  }

};

});
