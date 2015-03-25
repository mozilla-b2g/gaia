define(function(require) {
  'use strict';

  var Module = require('modules/base/module');

  /**
   * EventEmitter implements basic event emitting logics. It also provides
   * function that augments the ability to other objects.
   *
   * @example
   *   var eventEmitter = EventEmitter(['event1', 'event2']);
   *   var eventHandler = function(event) {
   *     console.log(event.detail);
   *   };
   *   var obj = {
   *     handleEvent: function(event) {
   *       console.log(event.detail);
   *     }
   *   };
   *
   *   eventEmitter.addEventListener('event1', eventHandler);
   *   eventEmitter.addEventListener('event2', obj);
   *
   *   eventEmitter._emitEvent('event1', 'value1'); // value1
   *   eventEmitter._emitEvent('event2', 'value2'); // value2
   *
   * Extending from EventEmitter:
   * @example
   *   var NewModule = Module.create(function() {
   *     this.super(EventEmitter).call(this, ['event1', 'event2']);
   *   }).extend(EventEmitter);
   *
   *   var module = NewModule();
   *
   * @class EventEmitter
   * @returns {EventEmitter}
   */
  var EventEmitter = Module.create(function EventEmitter(eventNames) {
    if (eventNames && eventNames.length) {
      this._eventListeners = eventNames.reduce((result, eventName) => {
        result[eventName] = [];
        return result;
      }, {});
    } else {
      this.throw('no valid registered events');
    }
  });

  /**
   * Emit an event of a specific type and a given value.
   *
   * @access private
   * @memberOf EventEmitter.prototype
   * @param {String} eventName
   * @param {Object} value
   */
  EventEmitter.prototype._emitEvent = function(eventName, value) {
    var listeners = this._eventListeners[eventName];
    if (!listeners) {
      this.throw('invalid event name: ' + eventName);
    }

    this.debug('_emitEvent:' + eventName + ' ' + value);
    var eventObj = {
      type: eventName,
      detail: value
    };
    listeners.forEach((listener) => {
      listener.call(this, eventObj);
    });
  };

  /**
   * Add an event listener on an event. If listener is an object,
   * object.handleEvent is called when the event emits.
   *
   * @access public
   * @memberOf EventEmitter.prototype
   * @param {String} eventName
   * @param {(Function|Object)} listener
   */
  EventEmitter.prototype.addEventListener = function(eventName, listener) {
    var listeners = this._eventListeners[eventName];
    if (listener && listeners) {
      switch (typeof listener) {
        case 'function':
          break;
        case 'object':
          if (typeof listener.handleEvent === 'function') {
            listener = listener.handleEvent;
          } else {
            listener = null;
          }
          break;
        default:
          listener = null;
          break;
      }
      if (listener && listeners.indexOf(listener) < 0) {
        listeners.push(listener);
      } 
    } else {
      this.error('addEventListener: invalid listener for ' + eventName);
    }
  };

  /**
   * Remove the event listener from an event.
   *
   * @access public
   * @memberOf EventEmitter.prototype
   * @param {String} eventName
   * @param {(Function|Object)} listener
   */
  EventEmitter.prototype.removeEventListener = function(eventName, listener) {
    var listeners = this._eventListeners[eventName];
    if (listener && listeners) {
      var index = -1;
      var type = typeof listener;
      switch (type) {
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
    } else {
      this.error('removeEventListener: invalid listener for ' + eventName);
    }
  };

  return EventEmitter;
});
