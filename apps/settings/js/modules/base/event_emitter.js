define(function() {
  'use strict';

  function EventEmitter(eventNames) {
    if (eventNames && eventNames.length) {
      this._eventListeners = {};
      eventNames.forEach((eventName) => {
        this._eventListeners[eventName] = [];
      });
    } else {
      throw new Error('EventEmitter: no valid registered events');
    }
  }

  EventEmitter.prototype._emitEvent = function(eventName, value) {
    var listeners = this._eventListeners[eventName];
    if (listeners) {
      var eventObj = new CustomEvent(eventName, {
        detail: value
      });
      listeners.forEach((listener) => {
        listener(eventObj);
      });
    }
  };

  EventEmitter.prototype.addEventListener = function(eventName, listener) {
    var listeners = this._eventListeners[eventName];
    if (listener && listeners && listeners.indexOf(listener) < 0) {
      var type = typeof listener;
      switch(type) {
        case 'function':
          listeners.push(listener);
          break;
        case 'object':
          if (typeof listener.handleEvent === 'function') {
            listeners.push(listener.handleEvent);
          }
          break;
      }
    }
  };

  EventEmitter.prototype.removeEventListener = function(eventName, listener) {
    var listeners = this._eventListeners[eventName];
    if (listener && listeners) {
      var index = -1;
      var type = typeof listener;
      switch(type) {
        case 'function':
          index = listeners.indexOf(listener);
          break;
        case 'object':
          index = listeners.indexOf(listener.handleEvent);
          break;
      }
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  };

  function _ctor(eventNames) {
    return new EventEmitter(eventNames);
  }

  function _augment(prototype) {
    Object.keys(EventEmitter.prototype).forEach(function(key) {
      prototype[key] = EventEmitter.prototype[key];
    });
  }

  Object.defineProperty(_ctor, 'ctor', {
    enumerable: true,
    writable: false,
    value: function(thisObj, eventNames) {
      EventEmitter.call(thisObj, eventNames);
      return thisObj;
    }
  });

  Object.defineProperty(_ctor, 'augment', {
    enumerable: true,
    writable: false,
    value: _augment
  });

  return _ctor;
});
