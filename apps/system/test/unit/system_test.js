/* globals System, MocksHelper, MockAppWindowManager */
'use strict';

mocha.globals(['System']);

requireApp('system/test/unit/mock_app_window_manager.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksForSystem = new MocksHelper([
  'AppWindowManager', 'LazyLoader'
]).init();

suite('system/System', function() {
  var clock;
  mocksForSystem.attachTestHelpers();
  setup(function(done) {
    clock = this.sinon.useFakeTimers();
    requireApp('system/js/system.js', done);
  });

  test('Busy loading if the active app is not loaded.', function() {
    this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns({
      loaded: false
    });
    assert.isTrue(System.isBusyLoading());
  });

  suite('Services', function() {
    teardown(function() {
      System._services.clear();
      System._providers.clear();
    });

    test('Service provider is online.', function(done) {
      var spy = this.sinon.spy();
      var fakeLockscreenWindowManager = {
        lock: spy
      };
      System.register('lock', fakeLockscreenWindowManager);
      System.request('lock').then(function() {
        assert.isTrue(spy.called);
        done();
      });
    });

    test('Service provider is offline.', function() {
      System.request('lock');
      var fakeLockscreenWindowManager = {
        name: 'fakeLWM',
        lock: function() {}
      };
      var stubLock = this.sinon.stub(fakeLockscreenWindowManager, 'lock');
      System.register('lock', fakeLockscreenWindowManager);
      assert.isTrue(stubLock.called);
    });

    test('Specific service provider is online.', function() {
      var fakeLockscreenWindowManager = {
        name: 'fakeLWM',
        lock: function() {}
      };
      System.register('lock', fakeLockscreenWindowManager);
      var stubLock = this.sinon.stub(fakeLockscreenWindowManager, 'lock');
      System.request('fakeLWM:lock');
      assert.isTrue(stubLock.called);
    });

    test('Specific service provider was ever online.', function() {
      var fakeLockscreenWindowManager = {
        name: 'fakeLWM',
        lock: function() {}
      };
      System.register('lock', fakeLockscreenWindowManager);
      var stubLock = this.sinon.stub(fakeLockscreenWindowManager, 'lock');
      System.unregister('lock', fakeLockscreenWindowManager);
      System.request('fakeLWM:lock');
      assert.isFalse(stubLock.called);
    });

    test('Specific service provider is offline.', function() {
      System.request('fakeLWM:lock');
      var fakeLockscreenWindowManager = {
        name: 'fakeLWM',
        lock: function() {}
      };
      var stubLock = this.sinon.stub(fakeLockscreenWindowManager, 'lock');
      System.register('lock', fakeLockscreenWindowManager);
      assert.isTrue(stubLock.called);
    });

    test('Passing arguments to specific service provider.', function() {
      var client = {
        value: null,
        observe: function(value) {
          this.value = value;
        }
      };
      System.request('addObserver', client);
      var fakeSettingsServer = {
        name: 'fakeSettingsServer',
        addObserver: function(client) {
          this.client = client;
        }
      };
      System.register('addObserver', fakeSettingsServer);
      fakeSettingsServer.client.observe(2);
      assert.equal(client.value, 2);
    });

    test('Chaining promises.', function(done) {
      var client = {
        value: 1,
        read: function(value) {
          var self = this;
          System.request('read').then(function(value) {
            self.value = value;
            assert.equal(self.value, 2);

            done();
          });
        }
      };
      var fakeSettingsServer = {
        name: 'fakeSettingsServer',
        read: function() {
          return new Promise(function(resolve) {
            resolve(2);
          });
        }
      };
      client.read();
      System.register('read', fakeSettingsServer);
    });
  });
});
