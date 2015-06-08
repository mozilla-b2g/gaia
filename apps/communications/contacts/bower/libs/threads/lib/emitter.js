'use strict';

/**
 * Exports
 */

module.exports = Emitter;

/**
 * Simple logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[Emitter]') : function(){};

/**
 * Create new `Emitter`
 *
 * @constructor
 */

function Emitter() {}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var EmitterPrototype = Emitter.prototype;

/**
 * Add an event listener.
 *
 * It is possible to subscript to * events.
 *
 * @param  {String}   type
 * @param  {Function} callback
 * @return {Emitter} for chaining
 */

EmitterPrototype.on = function(type, callback) {
  debug('on', type, callback);
  if (!this._callbacks) this._callbacks = {};
  if (!this._callbacks[type]) this._callbacks[type] = [];
  this._callbacks[type].push(callback);
  return this;
};

/**
 * Remove an event listener.
 *
 * Example:
 *
 *   emitter.off('name', fn); // remove one callback
 *   emitter.off('name'); // remove all callbacks for 'name'
 *   emitter.off(); // remove all callbacks
 *
 * @param  {String} type (optional)
 * @param  {Function} callback (optional)
 * @return {Emitter} for chaining
 */

EmitterPrototype.off = function(type, callback) {
  debug('off', type, callback);
  if (this._callbacks) {
    switch (arguments.length) {
      case 0: this._callbacks = {}; break;
      case 1: delete this._callbacks[type]; break;
      default:
        var typeListeners = this._callbacks[type];
        if (!typeListeners) return;
        var i = typeListeners.indexOf(callback);
        if (~i) typeListeners.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit an event.
 *
 * Example:
 *
 *   emitter.emit('name', { some: 'data' });
 *
 * @param  {String} type
 * @param  {*} data
 * @return {Emitter} for chaining
 */

EmitterPrototype.emit = function(type, data) {
  debug('emit', type, data);
  if (this._callbacks) {
    var fns = this._callbacks[type] || [];
    fns = fns.concat(this._callbacks['*'] || []);
    for (var i = 0; i < fns.length; i++) fns[i].call(this, data, type);
  }
  return this;
};
