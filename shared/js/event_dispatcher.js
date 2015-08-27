/*global Map, Set */

/* exported EventDispatcher */

/*
 * This file provides an helper to add custom events to any object.
 *
 * In order to use this functionality wrap your object using the
 * 'EventDispatcher.mixin' function:
 *
 * var obj = EventDispatcher.mixin(new SomeObj());
 *
 * A list of events can be optionally provided and it is recommended to do so.
 * If a list is provided then only the events present in the list will be
 * allowed. Using events not present in the list will cause other functions to
 * throw an error:
 *
 * var obj = EventDispatcher.mixin(new SomeObj(), [
 *   'somethinghappened',
 *   'somethingelsehappened'
 * ]);
 *
 * The wrapped object will have five new methods: 'on', 'once', 'off', 'offAll'
 * and 'emit'. Use 'on' to register a new event-handler:
 *
 * obj.on("somethinghappened", function onSomethingHappened() { ... });
 *
 * If the same event-handler is added multiple times then only one will be
 * registered, e.g.:
 *
 * function onSomethingHappened() { ... }
 * obj.on("somethinghappened", onSomethingHappened);
 * obj.on("somethinghappened", onSomethingHappened); // Does nothing
 *
 * Use 'off' to remove a registered listener:
 *
 * obj.off("somethinghappened", onSomethingHappened);
 *
 * Use 'once' to register a one-time event-handler: it will be automatically
 * unregistered after being called.
 *
 * obj.once("somethinghappened", function onSomethingHappened() { ... });
 *
 * And use 'offAll' to remove all registered event listeners for the specified
 * event:
 *
 * obj.offAll("somethinghappened");
 *
 * When used without parameters 'offAll' removes all registered event handlers,
 * this can be useful when writing unit-tests.
 *
 * Finally use 'emit' to send an event to the registered handlers:
 *
 * obj.emit("somethinghappened");
 *
 * An optional parameter can be passed to 'emit' to be passed to the registered
 * handlers:
 *
 * obj.emit("somethinghappened", 123);
 */

(function(exports) {
  'use strict';

  function ensureValidEventName(eventName) {
    if (!eventName || typeof eventName !== 'string') {
      throw new Error('Event name should be a valid non-empty string!');
    }
  }

  function ensureValidHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler should be a function!');
    }
  }

  function ensureAllowedEventName(allowedEvents, eventName) {
    if (allowedEvents && allowedEvents.indexOf(eventName) < 0) {
      throw new Error('Event "' + eventName + '" is not allowed!');
    }
  }

  // Implements publish/subscribe behaviour that can be applied to any object,
  // so that object can be listened for custom events. "this" context is the
  // object with Map "listeners" property used to store handlers.
  var eventDispatcher = {
    /**
     * Registers listener function to be executed once event occurs.
     * @param {string} eventName Name of the event to listen for.
     * @param {function} handler Handler to be executed once event occurs.
     */
    on: function(eventName, handler) {
      ensureValidEventName(eventName);
      ensureAllowedEventName(this.allowedEvents, eventName);
      ensureValidHandler(handler);

      var handlers = this.listeners.get(eventName);

      if (!handlers) {
        handlers = new Set();
        this.listeners.set(eventName, handlers);
      }

      // Set.add ignores handler if it has been already registered
      handlers.add(handler);
    },

    /**
     * Registers listener function to be executed only first time when event
     * occurs.
     * @param {string} eventName Name of the event to listen for.
     * @param {function} handler Handler to be executed once event occurs.
     */
    once: function(eventName, handler) {
      ensureValidHandler(handler);

      var once = (parameters) => {
        eventDispatcher.off.call(this, eventName, once);

        handler(parameters);
      };

      eventDispatcher.on.call(this, eventName, once);
    },

    /**
     * Removes registered listener for the specified event.
     * @param {string} eventName Name of the event to remove listener for.
     * @param {function} handler Handler to remove, so it won't be executed
     * next time event occurs.
     */
    off: function(eventName, handler) {
      ensureValidEventName(eventName);
      ensureAllowedEventName(this.allowedEvents, eventName);
      ensureValidHandler(handler);

      var handlers = this.listeners.get(eventName);

      if (!handlers) {
        return;
      }

      handlers.delete(handler);

      if (!handlers.size) {
        this.listeners.delete(eventName);
      }
    },

    /**
     * Removes all registered listeners for the specified event.
     * @param {string} eventName Name of the event to remove all listeners for.
     */
    offAll: function(eventName) {
      if (typeof eventName === 'undefined') {
        this.listeners.clear();
        return;
      }

      ensureValidEventName(eventName);
      ensureAllowedEventName(this.allowedEvents, eventName);

      var handlers = this.listeners.get(eventName);

      if (!handlers) {
        return;
      }

      handlers.clear();

      this.listeners.delete(eventName);
    },

    /**
     * Emits specified event so that all registered handlers will be called
     * with the specified parameters.
     * @param {string} eventName Name of the event to call handlers for.
     * @param {Object} parameters Optional parameters that will be passed to
     * every registered handler.
     */
    emit: function(eventName, parameters) {
      ensureValidEventName(eventName);
      ensureAllowedEventName(this.allowedEvents, eventName);

      var handlers = this.listeners.get(eventName);

      if (!handlers) {
        return;
      }

      handlers.forEach(function(handler) {
        try {
          handler(parameters);
        } catch (e) {
          console.error(e);
        }
      });
    }
  };

  exports.EventDispatcher = {
    /**
     * Mixes dispatcher methods into target object.
     * @param {Object} target Object to mix dispatcher methods into.
     * @param {Array.<string>} allowedEvents Optional list of the allowed event
     * names that can be emitted and listened for.
     * @returns {Object} Target object with added dispatcher methods.
     */
    mixin: function(target, allowedEvents) {
      if (!target || typeof target !== 'object') {
        throw new Error('Object to mix into should be valid object!');
      }

      if (typeof allowedEvents !== 'undefined' &&
          !Array.isArray(allowedEvents)) {
        throw new Error('Allowed events should be a valid array of strings!');
      }

      Object.keys(eventDispatcher).forEach(function(method) {
        if (typeof target[method] !== 'undefined') {
          throw new Error(
            'Object to mix into already has "' + method + '" property defined!'
          );
        }
        target[method] = eventDispatcher[method].bind(this);
      }, { listeners: new Map(), allowedEvents: allowedEvents });

      return target;
    }
  };
})(self);
