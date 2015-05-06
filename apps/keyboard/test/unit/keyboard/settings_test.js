'use strict';

/* global MockNavigatorMozSettings, MockNavigatorMozSettingsLock,
          SettingsPromiseManager, SettingsManagerBase */

require('/js/keyboard/settings.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/js/input_mgmt/mock_navigator_mozsettings.js');

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
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    var lockGetSpy = this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.get('foo');

    assert.isTrue(createLockStub.calledOnce);

    assert.isTrue(lockGetSpy.calledOnce);
    assert.isTrue(lockGetSpy.calledWith('foo'));

    var req = lockGetSpy.getCall(0).returnValue;
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
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    var lockGetSpy = this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.get(['foo', 'foo2']);

    assert.isTrue(createLockStub.calledOnce);

    assert.isTrue(lockGetSpy.calledTwice);
    assert.isTrue(lockGetSpy.calledWith('foo'));
    assert.isTrue(lockGetSpy.calledWith('foo2'));

    var req1 = lockGetSpy.getCall(0).returnValue;
    req1.fireSuccess({ 'foo': 'bar' });
    var req2 = lockGetSpy.getCall(1).returnValue;
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
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    var lockGetSpy = this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);


    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.get('foo');

    assert.isTrue(createLockStub.calledOnce);

    assert.isTrue(lockGetSpy.calledOnce);
    assert.isTrue(lockGetSpy.calledWith('foo'));

    var req = lockGetSpy.getCall(0).returnValue;
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
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    var lockSetSpy = this.sinon.spy(lock, 'set');
    createLockStub.returns(lock);


    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.set('foo', 'bar');

    assert.isTrue(createLockStub.calledOnce);

    assert.isTrue(lockSetSpy.calledOnce);
    assert.isTrue(lockSetSpy.calledWith({'foo': 'bar' }));

    var req = lockSetSpy.getCall(0).returnValue;
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
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    var lockSetSpy = this.sinon.spy(lock, 'set');
    createLockStub.returns(lock);


    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.set({foo: 'bar', foo2: 'bar2' });

    assert.isTrue(createLockStub.calledOnce);

    assert.isTrue(lockSetSpy.calledOnce);
    assert.isTrue(lockSetSpy.calledWith({foo: 'bar', foo2: 'bar2' }));

    var req = lockSetSpy.getCall(0).returnValue;
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
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    var lockSetSpy = this.sinon.spy(lock, 'set');
    createLockStub.returns(lock);


    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.set('foo', 'bar');

    assert.isTrue(createLockStub.calledOnce);

    assert.isTrue(lockSetSpy.calledOnce);
    assert.isTrue(lockSetSpy.calledWith({'foo': 'bar' }));

    var req = lockSetSpy.getCall(0).returnValue;
    req.fireError('error');

    p.then(function(value) {
      assert.isTrue(false, 'Should not resolve the promise.');

      done();
    }, function(error) {
      assert.isTrue(true, 'Promise rejected.');

      done();
    });
  });

  test('update one', function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    var lockGetSpy = this.sinon.spy(lock, 'get');
    var lockSetSpy = this.sinon.spy(lock, 'set');
    createLockStub.returns(lock);

    var callback = this.sinon.spy(function(val) {
      return 'bar2';
    });

    var promiseManager = new SettingsPromiseManager();
    var p = promiseManager.updateOne('foo', callback);

    assert.isTrue(createLockStub.calledOnce);

    assert.isTrue(lockGetSpy.calledOnce);
    assert.isTrue(lockGetSpy.calledWith('foo'));

    var req = lockGetSpy.getCall(0).returnValue;
    req.fireSuccess({ 'foo': 'bar' });

    assert.isTrue(callback.calledOnce);

    assert.isTrue(lockSetSpy.calledOnce);
    assert.isTrue(lockSetSpy.calledWith({ 'foo': 'bar2' }));

    var req2 = lockSetSpy.getCall(0).returnValue;
    req2.fireSuccess(0);

    p.then(function() {
      assert.isTrue(createLockStub.calledOnce, 'Use one lock only.');
      assert.isTrue(callback.calledOnce, 'callback called once only.');
    }).then(done, done);
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
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    var lockGetSpy = this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    var addObserverSpy = this.sinon.spy(mozSettings, 'addObserver');
    var removeObserverSpy = this.sinon.spy(mozSettings, 'removeObserver');

    var promiseManager = new SettingsPromiseManager();
    var settingsManager = new SettingsManagerBase();
    settingsManager.promiseManager = promiseManager;
    settingsManager.KEYS = ['foo', 'foo2'];
    settingsManager.PROPERTIES = ['fooValue', 'foo2Value'];

    var p = settingsManager.initSettings();

    assert.isTrue(createLockStub.calledOnce);

    assert.isTrue(lockGetSpy.calledTwice);
    assert.isTrue(lockGetSpy.calledWith('foo'));
    assert.isTrue(lockGetSpy.calledWith('foo2'));

    var req1 = lockGetSpy.getCall(0).returnValue;
    req1.fireSuccess({ 'foo': 'bar' });
    var req2 = lockGetSpy.getCall(1).returnValue;
    req2.fireSuccess({ 'foo2': 'bar2' });

    assert.equal(settingsManager.initialized, false);

    var p2 = settingsManager.initSettings();
    assert.equal(p, p2);

    p.then(function(settings) {
      assert.equal(settingsManager.initialized, true);

      assert.equal(settings.fooValue, 'bar');
      assert.equal(settings.foo2Value, 'bar2');

      var s = settingsManager.getSettingsSync();
      assert.equal(s, settings);

      assert.isTrue(addObserverSpy.calledTwice);
      assert.isTrue(addObserverSpy.calledWith('foo'));
      assert.isTrue(addObserverSpy.calledWith('foo2'));

      var calls = 0;
      settingsManager.onsettingchange = function(s2) {
        calls++;

        var s = settingsManager.getSettingsSync();
        assert.equal(s2, s);

        switch (calls) {
          case 1:
            assert.equal(s2.fooValue, 'BAR');

            break;

          case 2:
            assert.equal(s2.foo2Value, 'BAR2');

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
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    var lockGetSpy = this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    var addObserverSpy = this.sinon.spy(mozSettings, 'addObserver');
    var removeObserverSpy = this.sinon.spy(mozSettings, 'removeObserver');

    var promiseManager = new SettingsPromiseManager();
    var settingsManager = new SettingsManagerBase();
    settingsManager.promiseManager = promiseManager;
    settingsManager.KEYS = ['foo', 'foo2'];
    settingsManager.PROPERTIES = ['fooValue', 'foo2Value'];

    var p = settingsManager.initSettings();

    assert.isTrue(createLockStub.calledOnce);

    assert.isTrue(lockGetSpy.calledTwice);
    assert.isTrue(lockGetSpy.calledWith('foo'));
    assert.isTrue(lockGetSpy.calledWith('foo2'));

    var req1 = lockGetSpy.getCall(0).returnValue;
    req1.fireError('error');
    var req2 = lockGetSpy.getCall(1).returnValue;
    req2.fireError('error');

    p.then(function() {
      assert.isTrue(false, 'Should not resolve the promise.');

      done();
    }, function(error) {
      assert.equal(settingsManager.initialized, false);
      assert.equal(addObserverSpy.calledOnce, false);
      assert.equal(removeObserverSpy.calledOnce, false);

      done();
    });
  });
});
