'use strict';

/* global MockNavigatorMozSettings, SettingsPromiseManager,
          SettingsManagerBase */

require('/js/keyboard/settings.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/test/unit/mock_navigator_mozsettings.js');

suite('SettingsPromiseManager', function() {
  var realMozSettings;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  test('get one key', function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockSpy = this.sinon.spy(mozSettings, 'createLock');

    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.get('foo');

    assert.isTrue(createLockSpy.calledOnce);
    var lock = createLockSpy.getCall(0).returnValue;

    // XXX We are not given the opportunity to install spy on
    // the lock.get() method, so this is the only way to get it.
    assert.equal(lock.mCalls.length , 1);
    assert.equal(lock.mCalls[0].name, 'get');
    assert.deepEqual(lock.mCalls[0].arguments, ['foo']);

    var req = lock.mCalls[0].req;
    req.fireSuccess({ 'foo': 'bar' });

    p.then(function(value) {
      assert.equal(value, 'bar');

      done();
    }, function(error) {
      assert.isTrue(false, 'Should not reject the promise.');
      done();
    });
  });

  test('get multiple keys', function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockSpy = this.sinon.spy(mozSettings, 'createLock');

    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.get(['foo', 'foo2']);

    assert.isTrue(createLockSpy.calledOnce);
    var lock = createLockSpy.getCall(0).returnValue;

    // XXX We are not given the opportunity to install spy on
    // the lock.get() method, so this is the only way to get it.
    assert.equal(lock.mCalls.length , 2);
    assert.equal(lock.mCalls[0].name, 'get');
    assert.deepEqual(lock.mCalls[0].arguments, ['foo']);
    assert.equal(lock.mCalls[1].name, 'get');
    assert.deepEqual(lock.mCalls[1].arguments, ['foo2']);

    var req1 = lock.mCalls[0].req;
    req1.fireSuccess({ 'foo': 'bar' });
    var req2 = lock.mCalls[1].req;
    req2.fireSuccess({ 'foo2': 'bar2' });

    p.then(function(values) {
      assert.deepEqual(values, ['bar', 'bar2']);

      done();
    }, function(error) {
      assert.isTrue(false, 'Should not reject the promise.');
      done();
    });
  });

  test('get, handle error', function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockSpy = this.sinon.spy(mozSettings, 'createLock');

    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.get('foo');

    assert.isTrue(createLockSpy.calledOnce);
    var lock = createLockSpy.getCall(0).returnValue;

    // XXX We are not given the opportunity to install spy on
    // the lock.get() method, so this is the only way to get it.
    assert.equal(lock.mCalls.length , 1);
    assert.equal(lock.mCalls[0].name, 'get');
    assert.deepEqual(lock.mCalls[0].arguments, ['foo']);

    var req = lock.mCalls[0].req;
    req.fireError('error');

    p.then(function(value) {
      assert.isTrue(false, 'Should not resolve the promise.');

      done();
    }, function(error) {
      assert.isTrue(true, 'Promise rejected.');

      done();
    });
  });

  test('set one key', function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockSpy = this.sinon.spy(mozSettings, 'createLock');

    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.set('foo', 'bar');

    assert.isTrue(createLockSpy.calledOnce);
    var lock = createLockSpy.getCall(0).returnValue;

    // XXX We are not given the opportunity to install spy on
    // the lock.get() method, so this is the only way to get it.
    assert.equal(lock.mCalls.length , 1);
    assert.equal(lock.mCalls[0].name, 'set');
    assert.deepEqual(lock.mCalls[0].arguments, [{foo: 'bar'}]);

    var req = lock.mCalls[0].req;
    req.fireSuccess(0);

    p.then(function() {
      assert.isTrue(true, 'set success');

      done();
    }, function(error) {
      assert.isTrue(false, 'Should not reject the promise.');
      done();
    });
  });

  test('set multiple keys', function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockSpy = this.sinon.spy(mozSettings, 'createLock');

    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.set({foo: 'bar', foo2: 'bar2' });

    assert.isTrue(createLockSpy.calledOnce);
    var lock = createLockSpy.getCall(0).returnValue;

    // XXX We are not given the opportunity to install spy on
    // the lock.get() method, so this is the only way to get it.
    assert.equal(lock.mCalls.length , 1);
    assert.equal(lock.mCalls[0].name, 'set');
    assert.deepEqual(lock.mCalls[0].arguments, [{foo: 'bar', foo2: 'bar2' }]);

    var req = lock.mCalls[0].req;
    req.fireSuccess(0);

    p.then(function() {
      assert.isTrue(true, 'set success');

      done();
    }, function(error) {
      assert.isTrue(false, 'Should not reject the promise.');
      done();
    });
  });

  test('set, handle error', function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockSpy = this.sinon.spy(mozSettings, 'createLock');

    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.set('foo', 'bar');

    assert.isTrue(createLockSpy.calledOnce);
    var lock = createLockSpy.getCall(0).returnValue;

    // XXX We are not given the opportunity to install spy on
    // the lock.get() method, so this is the only way to get it.
    assert.equal(lock.mCalls.length , 1);
    assert.equal(lock.mCalls[0].name, 'set');
    assert.deepEqual(lock.mCalls[0].arguments, [{foo: 'bar'}]);

    var req = lock.mCalls[0].req;
    req.fireError('error');

    p.then(function(value) {
      assert.isTrue(false, 'Should not resolve the promise.');

      done();
    }, function(error) {
      assert.isTrue(true, 'Promise rejected.');

      done();
    });
  });
});

suite('SettingsManagerBase', function() {
  var realMozSettings;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  test('initSettings, observe change, stopObserve', function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockSpy = this.sinon.spy(mozSettings, 'createLock');
    var addObserverSpy = this.sinon.spy(mozSettings, 'addObserver');
    var removeObserverSpy = this.sinon.spy(mozSettings, 'removeObserver');

    var promiseManager = new SettingsPromiseManager();
    var settingsManager = new SettingsManagerBase();
    settingsManager.promiseManager = promiseManager;
    settingsManager.KEYS = ['foo', 'foo2'];
    settingsManager.PROPERTIES = ['fooValue', 'foo2Value'];

    var p = settingsManager.initSettings();

    assert.isTrue(createLockSpy.calledOnce);
    var lock = createLockSpy.getCall(0).returnValue;

    // XXX We are not given the opportunity to install spy on
    // the lock.get() method, so this is the only way to get it.
    assert.equal(lock.mCalls.length , 2);
    assert.equal(lock.mCalls[0].name, 'get');
    assert.deepEqual(lock.mCalls[0].arguments, ['foo']);
    assert.equal(lock.mCalls[1].name, 'get');
    assert.deepEqual(lock.mCalls[1].arguments, ['foo2']);

    var req1 = lock.mCalls[0].req;
    req1.fireSuccess({ 'foo': 'bar' });
    var req2 = lock.mCalls[1].req;
    req2.fireSuccess({ 'foo2': 'bar2' });

    p.then(function() {
      assert.equal(settingsManager.fooValue, 'bar');
      assert.equal(settingsManager.foo2Value, 'bar2');

      assert.isTrue(addObserverSpy.calledTwice);
      assert.isTrue(addObserverSpy.calledWith('foo'));
      assert.isTrue(addObserverSpy.calledWith('foo2'));

      var calls = 0;
      settingsManager.onsettingchange = function() {
        calls++;
        switch (calls) {
          case 1:
            assert.equal(settingsManager.fooValue, 'BAR');

            break;

          case 2:
            assert.equal(settingsManager.foo2Value, 'BAR2');

            settingsManager.stopObserve();
            assert.isTrue(removeObserverSpy.calledTwice);
            assert.isTrue(removeObserverSpy.calledWith('foo'));
            assert.isTrue(removeObserverSpy.calledWith('foo2'));

            done();
            break;

          default:
            assert.isTrue(false, 'called more than twice.');

            break;
        }
      };

      mozSettings.dispatchSettingChange('foo', 'BAR');
      mozSettings.dispatchSettingChange('foo2', 'BAR2');
    }, function(error) {
      assert.isTrue(false, 'Should not reject the promise.');
      done();
    });

  });

  test('initSettings and returned error', function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockSpy = this.sinon.spy(mozSettings, 'createLock');
    var addObserverSpy = this.sinon.spy(mozSettings, 'addObserver');
    var removeObserverSpy = this.sinon.spy(mozSettings, 'removeObserver');

    var promiseManager = new SettingsPromiseManager();
    var settingsManager = new SettingsManagerBase();
    settingsManager.promiseManager = promiseManager;
    settingsManager.KEYS = ['foo', 'foo2'];
    settingsManager.PROPERTIES = ['fooValue', 'foo2Value'];

    var p = settingsManager.initSettings();

    assert.isTrue(createLockSpy.calledOnce);
    var lock = createLockSpy.getCall(0).returnValue;

    // XXX We are not given the opportunity to install spy on
    // the lock.get() method, so this is the only way to get it.
    assert.equal(lock.mCalls.length , 2);
    assert.equal(lock.mCalls[0].name, 'get');
    assert.deepEqual(lock.mCalls[0].arguments, ['foo']);
    assert.equal(lock.mCalls[1].name, 'get');
    assert.deepEqual(lock.mCalls[1].arguments, ['foo2']);

    var req1 = lock.mCalls[0].req;
    req1.fireError('error');
    var req2 = lock.mCalls[1].req;
    req2.fireError('error');

    p.then(function() {
      assert.isTrue(false, 'Should not resolve the promise.');

      done();
    }, function(error) {
      assert.equal(addObserverSpy.calledOnce, false);
      assert.equal(removeObserverSpy.calledOnce, false);

      done();
    });
  });
});
