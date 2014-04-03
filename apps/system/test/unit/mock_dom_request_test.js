'use strict';
/* global MockDOMRequest */

requireApp('system/shared/test/unit/mocks/mock_dom_request.js');

suite('MockDOMRequest', function() {
  test('fireSuccess()', function(done) {
    var req = new MockDOMRequest();
    var result = {};
    var count = 5;
    var handleSuccesses = function handleSuccesses(evt) {
      assert.equal(req.result, result, 'req.result is the result.');
      assert.equal(evt.type, 'success', 'evt.type === success');
      assert.equal(evt.target, req, 'evt.target === req');
      assert.equal(req.error, undefined, 'req.error === undefined');

      count--;
      if (!count) {
        done();
      }
    };
    var successCallback = function successCallback(evt) {
      assert.equal(this, req, 'this == req');
      handleSuccesses(evt);
    };
    var successEventListener = {
      handleEvent: function successCallback(evt) {
        assert.equal(
          this, successEventListener, 'this == successEventListener');
        handleSuccesses(evt);
      }
    };

    var successCallbackToRemove = function() {
      assert.isTrue(false, 'Must not fire removed event handler.');
    };

    var successEventListenerToRemove = {
      handleEvent: successCallbackToRemove
    };

    var errorCallback = function(evt) {
      assert.isTrue(false, 'Must not fire error event.');
    };

    req.onsuccess = successCallback;
    req.addEventListener('success', successCallback);
    req.addEventListener('success', successCallback, true);
    req.addEventListener('success', successEventListener);
    req.addEventListener('success', successEventListener, true);

    req.addEventListener('success', successCallbackToRemove);
    req.addEventListener('success', successCallbackToRemove, true);
    req.addEventListener('success', successEventListenerToRemove);
    req.addEventListener('success', successEventListenerToRemove, true);
    req.removeEventListener('success', successCallbackToRemove);
    req.removeEventListener('success', successCallbackToRemove, true);
    req.removeEventListener('success', successEventListenerToRemove);
    req.removeEventListener('success', successEventListenerToRemove, true);

    req.onerror = errorCallback;
    req.addEventListener('error', errorCallback);
    req.addEventListener('error', errorCallback, true);
    req.addEventListener('error', {
      handleEvent: errorCallback
    });
    req.addEventListener('error', {
      handleEvent: errorCallback
    }, true);

    req.fireSuccess(result);
  });

  test('fireError()', function(done) {
    var req = new MockDOMRequest();
    var error = {};
    var count = 5;
    var handleErrors = function handleErrors(evt) {
      assert.equal(req.error, error, 'req.error is the error.');
      assert.equal(evt.type, 'error', 'evt.type === error');
      assert.equal(evt.target, req, 'evt.target === req');
      assert.equal(req.result, undefined, 'req.result === undefined');

      count--;
      if (!count) {
        done();
      }
    };
    var errorCallback = function errorCallback(evt) {
      assert.equal(this, req, 'this == req');
      handleErrors(evt);
    };
    var errorEventListener = {
      handleEvent: function errorCallback(evt) {
        assert.equal(
          this, errorEventListener, 'this == errorEventListener');
        handleErrors(evt);
      }
    };

    var errorCallbackToRemove = function() {
      assert.isTrue(false, 'Must not fire removed event handler.');
    };

    var errorEventListenerToRemove = {
      handleEvent: errorCallbackToRemove
    };

    var successCallback = function(evt) {
      assert.isTrue(false, 'Must not fire success event.');
    };

    req.onerror = errorCallback;
    req.addEventListener('error', errorCallback);
    req.addEventListener('error', errorCallback, true);
    req.addEventListener('error', errorEventListener);
    req.addEventListener('error', errorEventListener, true);

    req.addEventListener('error', errorCallbackToRemove);
    req.addEventListener('error', errorCallbackToRemove, true);
    req.addEventListener('error', errorEventListenerToRemove);
    req.addEventListener('error', errorEventListenerToRemove, true);
    req.removeEventListener('error', errorCallbackToRemove);
    req.removeEventListener('error', errorCallbackToRemove, true);
    req.removeEventListener('error', errorEventListenerToRemove);
    req.removeEventListener('error', errorEventListenerToRemove, true);

    req.onsuccess = successCallback;
    req.addEventListener('success', successCallback);
    req.addEventListener('success', successCallback, true);
    req.addEventListener('success', {
      handleEvent: successCallback
    });
    req.addEventListener('success', {
      handleEvent: successCallback
    }, true);

    req.fireError(error);
  });
});
