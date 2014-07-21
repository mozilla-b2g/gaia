'use strict';

/* global MockEventTarget, Promise */

(function(exports) {

  /**
   * MockInputMethod is a constructer function that will give you an mock
   * instance of `navigator.mozInputMethod`. For the real implementation, see
   * http://dxr.mozilla.org/mozilla-central/source/dom/inputmethod/MozKeyboard.js
   *
   * The only extra mothod in the mock is `setInputContext()`, for you to set
   * the inputContext.
   *
   * @param {Object} inputContext MockInputContext instance.
   *
   * @class MockInputMethod
   * @requires MockEventTarget
   */
  var MockInputMethod = function MockInputMethod(inputContext) {
    this.inputcontext = inputContext || null;
    this.mgmt = new MockInputMethodManager();
  };

  MockInputMethod.prototype = new MockEventTarget();

  MockInputMethod.prototype.oninputcontextchange = null;

  MockInputMethod.prototype.inputcontext = null;

  /**
   * Set the mocked inputContext. Will send an inputcontextchange event if
   * the context is different.
   *
   * @param {Object} inputContext MockInputContext instance.
   * @memberof MockInputMethod.prototype
   */
  MockInputMethod.prototype.setInputContext = function(inputContext) {
    inputContext = inputContext || null;
    if (inputContext === this.inputcontext) {
      return;
    }

    if (inputContext) {
      this.inputcontext = inputContext;
    } else {
      this.inputcontext = null;
    }

    var evt = {
      type: 'inputcontextchange'
    };
    this.dispatchEvent(evt);
  };

  /**
   * This class allow you to create a mock inputContext instance.
   * It does *not* manage it's own states and properties. Doing so inevitablely
   * reimplements the API :'(.
   *
   * Many of it's method returns a Promise. You should install a
   * sinon.spy on the method and retrive the Promise instance with
   * 'spy.getCall(0).returnValue'.
   *
   * These Promise instances comes with their `resolve()` and `reject()`
   * methods exposed, so you should call them accordingly after setting the
   * properties.
   *
   * Two additional methods, `fireSurroundingTextChange()` and
   * `fireSelectionChange()` allow you to dispatch simulated events.
   *
   * @class MockInputContext
   * @requires MockEventTarget
   *
   */
  var MockInputContext = function MockInputContext() {
  };

  MockInputContext.prototype = new MockEventTarget();

  MockInputContext.prototype.type = 'text';
  MockInputContext.prototype.inputType = 'text';
  MockInputContext.prototype.inputMode = '';
  MockInputContext.prototype.lang = '';

  MockInputContext.prototype.selectionStart = 0;
  MockInputContext.prototype.selectionEnd = 0;
  MockInputContext.prototype.textBeforeCursor = '';
  MockInputContext.prototype.textAfterCursor = '';

  MockInputContext.prototype.onsurroundingtextchange = null;

  MockInputContext.prototype.onselectionchange = null;

  MockInputContext.prototype.fireSurroundingTextChange = function() {
    var evt = {
      type: 'surroundingtextchange',
      detail: {
        beforeString: this.textBeforeCursor,
        afterString: this.textAfterCursor
      }
    };

    this.dispatchEvent(evt);
  };

  MockInputContext.prototype.fireSelectionChange = function() {
    var evt = {
      type: 'selectionchange',
      detail: {
        selectionStart: this.selectionStart,
        selectionEnd: this.selectionEnd
      }
    };

    this.dispatchEvent(evt);
  };

  MockInputContext.prototype.getText =
  MockInputContext.prototype.setSelectionRange =
  MockInputContext.prototype.replaceSurroundingText =
  MockInputContext.prototype.deleteSurroundingText =
  MockInputContext.prototype.sendKey =
  MockInputContext.prototype.setComposition =
  MockInputContext.prototype.endComposition = function sendPromise() {
    var oResolve, oReject;
    // We are using the native Promise here but expose
    // the reject method and a resolve method.
    // See http://mdn.io/promise
    var p = new Promise(function(resolve, reject) {
      oResolve = resolve;
      oReject = reject;
    });
    p.resolve = oResolve;
    p.reject = oReject;

    return p;
  };

  /**
   * A MockInputMethodManager instance when the
   * MockInputMethod instance is created.
   *
   * Noop method are in place to install spies.
   *
   * @class MockInputMethodManager
   *
   */
  var MockInputMethodManager = function MozInputMethodManager() {
  };

  MockInputMethodManager.prototype.showAll = function() {
  };

  MockInputMethodManager.prototype.next = function() {
  };

  MockInputMethodManager.prototype.hide = function() {
  };

  MockInputMethodManager.prototype.supportSwitching = false;

  exports.MockInputMethodManager = MockInputMethodManager;
  exports.MockInputMethod = MockInputMethod;
  exports.MockInputContext = MockInputContext;
}(window));
