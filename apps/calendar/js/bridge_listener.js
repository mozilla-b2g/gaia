define(function(require, exports, module) {
'use strict';

var core = require('core');
var Responder = require('common/responder');

function BridgeListener(opts) {
  Responder.call(this);

  this.pending = opts.pending != null ? opts.pending : false;
  this.startEvent = opts.startEvent;
  this.completeEvent = opts.completeEvent;
  this._events = opts.events;
}

module.exports = BridgeListener;

BridgeListener.prototype = Object.create(Responder.prototype);

BridgeListener.prototype.observe = function() {
  this._events.forEach(type => core.bridge.on(type, () => this.emit(type)));
};

});
