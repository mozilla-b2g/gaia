
/**
 * Evt
 *
 * A super lightweight
 * event emitter library.
 *
 * @version 0.3.3
 * @author Wilson Page <wilson.page@me.com>
 */

;(function() {

/**
 * Locals
 */

var proto = Events.prototype;
var slice = [].slice;

/**
 * Creates a new event emitter
 * instance, or if passed an
 * object, mixes the event logic
 * into it.
 *
 * @param  {Object} obj
 * @return {Object}
 */
function Events(obj) {
  if (!(this instanceof Events)) return new Events(obj);
  if (obj) return mixin(obj, proto);
}

/**
 * Registers a callback
 * with an event name.
 *
 * @param  {String}   name
 * @param  {Function} cb
 * @return {Event}
 */
proto.on = function(name, cb) {
  this._cbs = this._cbs || {};
  (this._cbs[name] || (this._cbs[name] = [])).push(cb);
  return this;
};

/**
 * Attach a callback that once
 * called, detaches itself.
 *
 * TODO: Implement `.off()` to work
 * with `once()` callbacks.
 *
 * @param  {String}   name
 * @param  {Function} cb
 * @public
 */
proto.once = function(name, cb) {
  this.on(name, one);
  function one() {
    cb.apply(this, arguments);
    this.off(name, one);
  }
};

/**
 * Removes a single callback,
 * or all callbacks associated
 * with the passed event name.
 *
 * @param  {String}   name
 * @param  {Function} cb
 * @return {Event}
 */
proto.off = function(name, cb) {
  this._cbs = this._cbs || {};

  if (!name) { this._cbs = {}; return; }
  if (!cb) { return delete this._cbs[name]; }

  var cbs = this._cbs[name] || [];
  var i;

  while (cbs && ~(i = cbs.indexOf(cb))) { cbs.splice(i, 1); }
  return this;
};

/**
 * Fires an event, triggering
 * all callbacks registered on this
 * event name.
 *
 * @param  {String} name
 * @return {Event}
 */
proto.fire = proto.emit = function(options) {
  var cbs = this._cbs = this._cbs || {};
  var name = options.name || options;
  var batch = (cbs[name] || []).concat(cbs['*'] || []);
  var ctx = options.ctx || this;

  if (batch.length) {
    this._fireArgs = arguments;
    var args = slice.call(arguments, 1);
    while (batch.length) {
      batch.shift().apply(ctx, args);
    }
  }

  return this;
};

proto.firer = function(name) {
  var self = this;
  return function() {
    var args = slice.call(arguments);
    args.unshift(name);
    self.fire.apply(self, args);
  };
};

/**
 * Util
 */

/**
 * Mixes in the properties
 * of the second object into
 * the first.
 *
 * @param  {Object} a
 * @param  {Object} b
 * @return {Object}
 */
function mixin(a, b) {
  for (var key in b) a[key] = b[key];
  return a;
}

/**
 * Expose 'Event' (UMD)
 */

if (typeof exports === 'object') {
  module.exports = Events;
} else if (typeof define === 'function' && define.amd) {
  define(function(){ return Events; });
} else {
  window.evt = Events;
}

})();