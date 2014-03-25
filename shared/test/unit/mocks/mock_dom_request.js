'use strict';

(function(exports) {
  /**
   * This is an reimplementation of DOMRequest in JavaScript,
   * usable as a mock for tests.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/API/DOMRequest
   * and http://dxr.mozilla.org/mozilla-central/source/dom/base/DOMRequest.h
   * for the simulated real APIs.
   *
   * There are two additional methods (fireSuccess() and fireError()) for
   * explicitly invoking success/error in test script.
   *
   * @class MockDOMRequest
   */
  var MockDOMRequest = function MockDOMRequest() {
    this._successCaptureCallbacks = [];
    this._successBubbleCallbacks = [];

    this._errorCaptureCallbacks = [];
    this._errorBubbleCallbacks = [];
  };

  /**
   * The operation's result.
   * @memberof MockDOMRequest.prototype
   * @type {Mixed}
   */
  MockDOMRequest.prototype.result = undefined;

  /**
   * Error information, if any.
   * @type {Mixed}
   */
  MockDOMRequest.prototype.error = undefined;

  /**
   * A callback handler called when the operation represented by the
   * DOMRequest is completed.
   * @memberof MockDOMRequest.prototype
   * @type {Function}
   */
  MockDOMRequest.prototype.onsuccess = undefined;

  /**
   * A callback handler that gets called when an error occurs while processing
   * the operation.
   * @memberof MockDOMRequest.prototype
   * @type {Function}
   */
  MockDOMRequest.prototype.onerror = undefined;

  /**
   * A string indicating whether or not the operation is finished running.
   * Its value is either "done" or "pending".
   * @memberof MockDOMRequest.prototype
   * @type {String}
   */
  MockDOMRequest.prototype.readyState = 'pending';

  /**
   * Adding an event listener for the success/error event.
   * @memberof MockDOMRequest.prototype
   * @param {String}          type     Event type, success or error.
   * @param {Function|Object} handler  Event handler.
   * @param {Boolean}         capture  True if use capture mode.
   */
  MockDOMRequest.prototype.addEventListener = function(type, handler, capture) {
    if (typeof handler !== 'function' && handler &&
        typeof handler.handleEvent !== 'function') {
      return;
    }

    switch (type) {
      case 'success':
        if (capture) {
          this._successCaptureCallbacks.push(handler);
        } else {
          this._successBubbleCallbacks.push(handler);
        }
        break;

      case 'error':
        if (capture) {
          this._errorCaptureCallbacks.push(handler);
        } else {
          this._errorBubbleCallbacks.push(handler);
        }
        break;
    }
  };
  /**
   * Remove an event listener for the success/error event.
   * @memberof MockDOMRequest.prototype
   * @param {String}          type     Event type, success or error.
   * @param {Function|Object} handler  Event handler.
   * @param {Boolean}         capture  True if use capture mode.
   */
  MockDOMRequest.prototype.removeEventListener = function(type, handler,
                                                          capture) {
    if (typeof handler !== 'function' && handler &&
        typeof handler.handleEvent !== 'function') {
      return;
    }

    var index;

    switch (type) {
      case 'success':
        if (capture) {
          index = this._successCaptureCallbacks.indexOf(handler);
          if (index !== -1) {
            this._successCaptureCallbacks.splice(index, 1);
          }
        } else {
          index = this._successBubbleCallbacks.indexOf(handler);
          if (index !== -1) {
            this._successBubbleCallbacks.splice(index, 1);
          }
        }
        break;

      case 'error':
        if (capture) {
          index = this._errorCaptureCallbacks.indexOf(handler);
          if (index !== -1) {
            this._errorCaptureCallbacks.splice(index, 1);
          }
        } else {
          index = this._errorBubbleCallbacks.indexOf(handler);
          if (index !== -1) {
            this._errorBubbleCallbacks.splice(index, 1);
          }
        }
        break;
    }
  };

  /**
   * Fire success event with result given.
   * @memberof MockDOMRequest.prototype
   * @param  {Mixed} result The result.
   */
  MockDOMRequest.prototype.fireSuccess = function(result) {
    if (this.readyState === 'done') {
      throw 'The DOMRequest instance has already fired.';
    }
    this.readyState = 'done';
    this.result = result;

    // Fake event that only implements two properties.
    // I am not interested in writing MockDOMEvent :-/
    var evt = {
      type: 'success',
      target: this
    };

    var handler = this._successCaptureCallbacks.shift();
    while (handler) {
      if (typeof handler === 'function') {
        handler.call(this, evt);
      } else {
        handler.handleEvent(evt);
      }

      handler = this._successCaptureCallbacks.shift();
    }
    if (this.onsuccess && typeof this.onsuccess === 'function') {
      this.onsuccess(evt);
    }

    handler = this._successBubbleCallbacks.shift();
    while (handler) {
      if (typeof handler === 'function') {
        handler.call(this, evt);
      } else {
        handler.handleEvent(evt);
      }

      handler = this._successBubbleCallbacks.shift();
    }

    this._errorCaptureCallbacks = [];
    this._errorBubbleCallbacks = [];
  };

  /**
   * Fire error event with error given.
   * @memberof MockDOMRequest.prototype
   * @param  {Mixed} error The error.
   */
  MockDOMRequest.prototype.fireError = function(error) {
    if (this.readyState === 'done') {
      throw 'The DOMRequest instance has already fired.';
    }
    this.readyState = 'done';
    this.error = error;

    // Fake event that only implements two properties.
    // I am not interested in writing MockDOMEvent :-/
    var evt = {
      type: 'error',
      target: this
    };

    var handler = this._errorCaptureCallbacks.shift();
    while (handler) {
      if (typeof handler === 'function') {
        handler.call(this, evt);
      } else {
        handler.handleEvent(evt);
      }

      handler = this._errorCaptureCallbacks.shift();
    }
    if (this.onerror && typeof this.onerror === 'function') {
      this.onerror(evt);
    }
    handler = this._errorBubbleCallbacks.shift();
    while (handler) {
      if (typeof handler === 'function') {
        handler.call(this, evt);
      } else {
        handler.handleEvent(evt);
      }

      handler = this._errorBubbleCallbacks.shift();
    }

    this._successCaptureCallbacks = [];
    this._successBubbleCallbacks = [];
  };

  exports.MockDOMRequest = MockDOMRequest;
}(window));
