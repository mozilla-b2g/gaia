'use strict';
var RPC = require('../../lib/rpc');
var Promise = require('promise');

var rpc = new RPC(process.send.bind(process));

rpc.register('test', {
  $rpc: { methods: ['args'] },

  getSelf: function() {
    return Promise.resolve(this);
  },

  noArgs: function() {
    return Promise.resolve();
  },

  args: function() {
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function(accept) {
      return accept(args);
    });
  },

  error: function() {
    return new Promise(function() {
      throw new Error('xfoo');
    });
  }
});

var handle = rpc.handle();
process.on('message', handle);
