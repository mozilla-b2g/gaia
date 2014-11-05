'use strict';

/**
 * MockPromise provides minimal logic to replace the original Promise interface.
 * It does not call anything when called. You should spy the functions to get
 * the passed callbacks and call them.
 *
 * This mock is only helpful if you are testing on a promise chain and you wish
 * to assert the condition of the middle of the chain. It will not be really
 * helpful if you are only interested in end-result of the chain from the
 * returned promise. (you could just then() your assert function after the
 * returned promise)
 *
 * Help methods are provided for calling the specified passed callback.
 * These methods however only deal with the first then() or catch() calls.
 *
 * This mock will help you make the test script testing promise chain
 * synchronize (without using any |done()| in mocha).
 *
 * For example, to test this chain:
 *
 * function foo() {
 *   (new Promise(callback1))
 *     .then(doSomething1)
 *     .then(doSomething2)
 *     .catch(somethingWrong1);
 * }
 *
 * You can do:
 *
 * // Execute the chain
 * foo();
 *
 * // Call callback1
 * var p0 = window.Promise.firstCall.returnValue;
 * p0.mExecuteCallback(function resolve(val) {
 *   ... assert val
 * }, function reject() {
 *   ... assert
 * });
 *
 * ... do something to cause the callback1 to call resolve or reject here.
 *
 * // Call doSomething1
 * var returned1 = p0.mFulfillToValue(val);
 *
 * ... assert end result of doSomething1
 *
 * // Call doSomething2
 * var p1 = p0.mGetNextPromise();
 * var returned2 = p1.mFulfillToValue(returned1);
 *
 * ... assert end result of doSomething2
 *
 * In a separate test, do any of the following will invoke somethingWrong1:
 *
 * p0.mRejectToError(error);
 * p1.mRejectToError(error);
 *
 */
(function(exports) {

var MockPromise = function MockPromise(callback) {
  var p = {
    then: sinon.spy(function SpyThen(onFulfilled, onRejected) {
      return new MockPromise();
    }),

    catch: sinon.spy(function SpyCatch(onRejected) {
      return new MockPromise();
    }),

    mExecuteCallback: function mExecCallback(resolve, reject) {
      callback(resolve, reject);
    },

    mGetNextPromise: function mGetNextPromise() {
      if (!this.then.called) {
        throw new Error(
          'MockPromise: cannot mGetNextPromise, then() not called.');
      }

      return this.then.firstCall.returnValue;
    },

    mFulfillToValue: function mFulfill(value) {
      if (!this.then.called) {
        throw new Error('MockPromise: cannot fulfill, then() not called.');
      }

      return this.then.firstCall.args[0].call(window, value);
    },

    mRejectToError: function mRejectToError(error) {
      if (this.then.called) {
       if (typeof this.then.firstCall.args[1] === 'function') {
          return this.then.firstCall.args[1].call(window, error);
        } else {
          return this.then.firstCall.returnValue.mRejectToError(error);
        }
      } else if (this.catch.called) {
        return this.catch.firstCall.args[0].call(window, error);
      } else {
        throw new Error(
          'MockPromise: cannot reject, then() nor catch() not called.');
      }
    }
  };

  return p;
};

// Spy these in setup(), e.g.
// this.sinon.spy(MockPromise, 'all');
MockPromise.all = MockPromise;
MockPromise.reject = MockPromise;
MockPromise.resolve = MockPromise;
MockPromise.race = MockPromise;

// Spy this in setup(), e.g.
// window.Promise = this.sinon.spy(MockPromise);
exports.MockPromise = MockPromise;

})(window);
