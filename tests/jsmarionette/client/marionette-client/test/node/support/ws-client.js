'use strict';
var EventEmitter = require('events').EventEmitter;

var WSClient = function() {
  this.sendCalls = [];
  EventEmitter.call(this);
};

WSClient.prototype = Object.create(EventEmitter.prototype);
WSClient.prototype.onsend = function() {};
WSClient.prototype.send = function() {
  this.onsend.apply(this, arguments);
  this.sendCalls.push(Array.prototype.slice.call(arguments));
};


module.exports = exports = WSClient;
