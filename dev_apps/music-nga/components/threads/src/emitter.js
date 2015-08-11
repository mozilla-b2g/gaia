'use strict';

/**
 * Exports
 * @ignore
 */

module.exports = Emitter;

/**
 * Simple logger
 *
 * @type {Function}
 * @private
 */

var debug = 0 ? console.log.bind(console, '[Emitter]') : () => {};

/**
 * Create new `Emitter`
 *
 * @class Emitter
 */

function Emitter(host) {
  if (host) return Object.assign(host, Emitter.prototype);
}

Emitter.prototype = {

  /**
   * Add an event listener.
   *
   * It is possible to subscript to * events.
   *
   * @param  {String}   type
   * @param  {Function} callback
   * @return {this} for chaining
   */

  on: function(type, callback) {
    debug('on', type, callback);
    if (!this._callbacks) this._callbacks = {};
    if (!this._callbacks[type]) this._callbacks[type] = [];
    this._callbacks[type].push(callback);
    return this;
  },

  /**
   * Remove an event listener.
   *
   * @example
   *
   * emitter.off('name', fn); // remove one callback
   * emitter.off('name'); // remove all callbacks for 'name'
   * emitter.off(); // remove all callbacks
   *
   * @param  {String} [type]
   * @param  {Function} [callback]
   * @return {this} for chaining
   */

  off: function(type, callback) {
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
      }
    }
    return this;
  },

  /**
   * Emit an event.
   *
   * @example
   *
   * emitter.emit('name', { some: 'data' });
   *
   * @param  {String} type
   * @param  {*} [data]
   * @return {this} for chaining
   */

  emit: function(type, data) {
    debug('emit', type, data);
    if (this._callbacks) {
      var fns = this._callbacks[type] || [];
      fns = fns.concat(this._callbacks['*'] || []);
      for (var i = 0; i < fns.length; i++) fns[i].call(this, data, type);
    }
    return this;
  }
};

var p = Emitter.prototype;
p['off'] = p.off;
p['on'] = p.on;
