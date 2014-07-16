'use strict';

(function(exports) {
  /**
   * This is an reimplementation of EventTarget in JavaScript,
   * usable as a mock for tests, and creating interfaces that inherits
   * from MockEventTarget.
   *
   * @class MockEventTarget
   */
  var MockEventTarget = function MockEventTarget() {
  };

  /**
   * Adding an event listener for the success/error event.
   * @memberof MockEventTarget.prototype
   * @param {String}          type     Event type, success or error.
   * @param {Function|Object} handler  Event handler.
   * @param {Boolean}         capture  True if use capture mode.
   */
  MockEventTarget.prototype.addEventListener =
    function(type, handler, capture) {
      if (typeof handler !== 'function' && handler &&
          typeof handler.handleEvent !== 'function') {
        return;
      }

      var eventCallbacks;
      if (capture) {
        eventCallbacks = this._captureCallbacks = this._captureCallbacks || {};
      } else {
        eventCallbacks = this._bubbleCallbacks = this._bubbleCallbacks || {};
      }

      eventCallbacks[type] = eventCallbacks[type] || [];
      // the same handler should not be added twice.
      if (eventCallbacks[type].indexOf(handler) !== -1) {
        return;
      }

      eventCallbacks[type].push(handler);
    };

  /**
   * Remove an event listener for the success/error event.
   * @memberof MockEventTarget.prototype
   * @param {String}          type     Event type, success or error.
   * @param {Function|Object} handler  Event handler.
   * @param {Boolean}         capture  True if use capture mode.
   */
  MockEventTarget.prototype.removeEventListener = function(type, handler,
                                                          capture) {
    if (typeof handler !== 'function' && handler &&
        typeof handler.handleEvent !== 'function') {
      return;
    }

    var eventCallbacks;
    if (capture) {
      eventCallbacks = this._captureCallbacks = this._captureCallbacks || {};
    } else {
      eventCallbacks = this._bubbleCallbacks = this._bubbleCallbacks || {};
    }

    var callbacks = eventCallbacks[type] || [];
    var index = callbacks.indexOf(handler);

    if (index === -1) {
      return;
    }

    callbacks.splice(index, 1);
  };

  /**
   * Dispatch event.
   * @memberof MockEventTarget.prototype
   * @param  {object} event Mocked event to dispatch (`type` is required).
   */
  MockEventTarget.prototype.dispatchEvent = function(evt) {
    var type = evt.type;

    this._captureCallbacks = this._captureCallbacks || {};
    this._bubbleCallbacks = this._bubbleCallbacks || {};

    var captureCallbacks = this._captureCallbacks[type] || [];
    var bubbleCallbacks = this._bubbleCallbacks[type] || [];

    // Don't overwrite evt.target if it is assigned already.
    // Sometimes we want to simulate event bubbling/capturing in the DOM tree
    // even though this is not how this mock behaves.
    if (!evt.target) {
      evt.target = this;
    }
    evt.currentTarget = this;

    captureCallbacks.forEach(function fireCaptureEvents(handler) {
      if (typeof handler === 'function') {
        handler.call(this, evt);
      } else {
        handler.handleEvent(evt);
      }
    }, this);

    if (('on' + evt.type) in this &&
        typeof this['on' + evt.type] === 'function') {
      this['on' + evt.type](evt);
    }

    bubbleCallbacks.forEach(function fireCaptureEvents(handler) {
      if (typeof handler === 'function') {
        handler.call(this, evt);
      } else {
        handler.handleEvent(evt);
      }
    }, this);
  };

  exports.MockEventTarget = MockEventTarget;
}(window));
