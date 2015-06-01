/* global Marionette */
/**
@namespace
*/
(function(module, ns) {
  'use strict';

  var Responder = ns.require('responder');

  function FakeSocket() {
    Responder.call(this);
    FakeSocket.sockets.push(this);

    this.destroyed = false;

    if(arguments.length === 2) {
      this.host = arguments[0];
      this.port = arguments[1];
    }
  }

  FakeSocket.sockets = [];

  FakeSocket.prototype = Object.create(Responder.prototype);
  FakeSocket.prototype.connect = function(port, host, cb) {
    this.port = port;
    this.host = host;
    cb && cb();
  };


  FakeSocket.prototype.destroy = function() {
    this.destroyed = true;
  };

  FakeSocket.prototype.close = FakeSocket.prototype.destroy;

  module.exports = exports = FakeSocket;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('support/socket'), Marionette] :
    [module, require('../../lib/marionette/marionette')]
));
