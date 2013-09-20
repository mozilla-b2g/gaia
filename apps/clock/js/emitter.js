// outer IIFE
(function(exports) {
'use strict';

// private storage for event handlers using WeakMap
var eventMap = new WeakMap();

/**
 * A simple Event Emitter prototype.  You can enhance any object to become an
 * event emitter by adding the methods to the object's prototype or object:
 *
 * MyConstructor.prototype = Object.create(Emitter.prototype)
 * -or-
 * Emitter.mixin(MyConstructor.prototype);
 * -or-
 * Emitter.mixin(MyObject);
 */
function Emitter() {}

/**
 * add Emitter prototype methods to an arbitrary object
 *
 * @param {object} target The object to decorate with the Emitter methods.
 */
Emitter.mixin = function(target) {
  // generate a non-enumerable property for each method
  methods.forEach(function extendObject(method) {
    Object.defineProperty(target, method, {
      configurable: true,
      value: Emitter.prototype[method]
    });
  });
  return target;
};

// Internal helper: generate or return the handler array for `type` on `object`
function getEvents(object, type) {
  var map = eventMap.get(object);
  if (!map) {
    map = {};
    eventMap.set(object, map);
  }
  if (typeof type !== 'string') {
    throw new Error('Event type must be a string');
  }
  if (!map[type]) {
    map[type] = {
      handlers: [],
      once: []
    };
  }
  return map[type];
}

/**
 * Bind Event Handlers
 * @param {string} type The event type to bind.
 * @param {function} handler The function to be called when event type emits.
 */
Emitter.prototype.on = function(type, handler) {
  var events = getEvents(this, type).handlers;
  if (typeof handler !== 'function') {
    throw new Error('handler must be a function');
  }
  events.push(handler);
  return this;
};

/**
 * Bind Event Handler to only be called once
 * @param {string} type The event type to bind.
 * @param {function} handler The function to be called when event type emits.
 */
Emitter.prototype.once = function(type, handler) {
  var events = getEvents(this, type).once;
  if (typeof handler !== 'function') {
    throw new Error('handler must be a function');
  }
  events.push(handler);
  return this;
};

/**
 * Unbind Event Handlers
 * @param {string} [type] The event type to unbind.  Removes all event
 *                        types if omitted.
 * @param {function} [handler] The function to unbind. Removes all handlers
 *                        of the specified 'type' if omitted.
 */
Emitter.prototype.off = function(type, handler) {
  // remove all events if no type
  if (!type) {
    eventMap.delete(this);
    return this;
  }
  var events = getEvents(this, type);
  // remove all events for type if no handler
  if (!handler) {
    events.handlers.length = 0;
    events.once.length = 0;
  } else {
    // remove only the handler
    var index = events.handlers.indexOf(handler);
    if (index !== -1) {
      events.handlers.splice(index, 1);
    } else {
      index = events.once.indexOf(handler);
      events.once.splice(index, 1);
    }
  }
  return this;
};

/**
 * Emit Event
 * @param {string} type The event type to emit.
 * @param {object} data The first argument passed to each handler
 *                      for the event type.
 */

Emitter.prototype.emit = function(type, data) {
  var event;
  var events = getEvents(this, type);
  var allEvents = events.handlers.concat(events.once);
  events.once.length = 0;

  if (allEvents.length) {
    while (event = allEvents.shift()) {
      event.call(this, data);
    }
  }
  return this;
};

var methods = Object.keys(Emitter.prototype);

// export our Emitter
exports.Emitter = Emitter;

// end outer IIFE
}(this));
