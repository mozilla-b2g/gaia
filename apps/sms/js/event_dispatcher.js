/*global Map, Set */

/* exported EventDispatcher */

(function(exports) {
  'use strict';

  function ensureValidEventName(eventName) {
    if (!eventName || typeof eventName !== 'string') {
      throw new Error('Event name should be valid non-empty string!');
    }
  }

  function ensureValidHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler should be function!');
    }
  }

  // Implements publish/subscribe behaviour that can be applied to any object,
  // so that object can be listened for custom events. "this" context is Map
  // instance used to store handlers.
  var eventDispatcher = {
    /**
     * Registers listener function to be executed once event occurs.
     * @param {string} eventName Name of the event to listen for.
     * @param {function} handler Handler to be executed once event occurs.
     */
    on: function(eventName, handler) {
      ensureValidEventName(eventName);
      ensureValidHandler(handler);

      var handlers = this.get(eventName);

      if (!handlers) {
        handlers = new Set();
        this.set(eventName, handlers);
      }

      // Set.add ignores handler if it has been already registered
      handlers.add(handler);
    },

    /**
     * Removes registered listener for the specified event.
     * @param {string} eventName Name of the event to remove listener for.
     * @param {function} handler Handler to remove, so it won't be executed
     * next time event occurs.
     */
    off: function(eventName, handler) {
      ensureValidEventName(eventName);
      ensureValidHandler(handler);

      var handlers = this.get(eventName);

      if (!handlers) {
        return;
      }

      handlers.delete(handler);

      if (!handlers.size) {
        this.delete(eventName);
      }
    },

    /**
     * Removes all registered listeners for the specified event.
     * @param {string} eventName Name of the event to remove all listeners for.
     */
    offAll: function(eventName) {
      ensureValidEventName(eventName);

      var handlers = this.get(eventName);

      if (!handlers) {
        return;
      }

      handlers.clear();

      this.delete(eventName);
    },

    /**
     * Triggers specified event so that all registered handlers will be called
     * with the specified parameters.
     * @param {string} eventName Name of the event to call handlers for.
     * @param {Object} parameters Optional parameters that will be passed to
     * every registered handler.
     */
    trigger: function(eventName, parameters) {
      ensureValidEventName(eventName);

      var handlers = this.get(eventName);

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
    mixin: function(target) {
      if (!target || typeof target !== 'object') {
        throw new Error('Object to mix into should be valid object!');
      }

      Object.keys(eventDispatcher).forEach(function(method) {
        target[method] = eventDispatcher[method].bind(this);
      }, new Map());

      return target;
    }
  };
})(window);
