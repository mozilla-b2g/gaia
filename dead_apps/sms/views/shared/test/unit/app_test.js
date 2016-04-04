/*global App, Promise */

'use strict';

require('/views/shared/js/app.js');

suite('App', function() {
  // Taken from app.js
  const APPLICATION_READY_CLASS_NAME = 'js-app-ready';

  teardown(function() {
    document.body.classList.remove(APPLICATION_READY_CLASS_NAME);
  });

  test('isReady is false by default', function() {
    assert.equal(App.isReady(), false);
  });

  test('setReady sets body class and isReady', function() {
    App.setReady();

    assert.equal(App.isReady(), true);
    assert.ok(document.body.classList.contains(APPLICATION_READY_CLASS_NAME));
  });

  test('setReady throws exception if called more than once', function() {
    App.setReady();

    assert.throws(function() {
      App.setReady();
    });
  });

  test('whenReady is resolved immediately if app is ready', function(done) {
    App.setReady();
    App.whenReady().then(function() {
      assert.ok(App.isReady());
    }).then(done, done);
  });

  test('whenReady is resolved when setReady is called', function(done) {
    var stub = sinon.stub();
    this.sinon.spy(App, 'setReady');

    var whenReadyPromise = App.whenReady();
    whenReadyPromise.then(stub).then(function() {
      assert.ok(App.isReady());
      sinon.assert.callOrder(App.setReady, stub);
    }).then(done, done);

    Promise.resolve().then(function() {
      App.setReady();
    });
  });

  test('whenReady is rejected in case of error', function(done) {
    var error = new Error('Test error');

    this.sinon.stub(MutationObserver.prototype, 'observe', function() {
      throw error;
    });

    App.whenReady().then(function() {
      throw new Error('Success callback should not have been called.');
    }, function(e) {
      assert.equal(e, error);
    }).then(done, done);

    App.setReady();
  });

  test('whenReady is rejected in case of error in MutationObserver callback',
    function(done) {
    var error = new Error('Test error');

    // This is called inside MutationObserver callback
    this.sinon.stub(MutationObserver.prototype, 'disconnect', function() {
      throw error;
    });

    App.whenReady().then(function() {
      throw new Error('Success callback should not have been called.');
    }, function(e) {
      assert.equal(e, error);
    }).then(done, done);

    App.setReady();
  });
});
