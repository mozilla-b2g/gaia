/* globals System, MocksHelper, MockAppWindowManager */
'use strict';

mocha.globals(['System']);

requireApp('system/shared/test/unit/mocks/mock_promise.js');
requireApp('system/test/unit/mock_app_window_manager.js');

var mocksForSystem = new MocksHelper([
  'AppWindowManager',
  'Promise'
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
      System._servers.clear();
    });

    test('Service provide is online.', function() {
      var fakeLockscreenWindowManager = {
        lock: function() {}
      };
      System.register('lock', fakeLockscreenWindowManager);
      var stubLock = this.sinon.stub(fakeLockscreenWindowManager, 'lock');
      System.request('lock');
      assert.isTrue(stubLock.called);
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

    test('Chaining promises.', function() {
      var client = {
        value: 1,
        read: function(value) {
          var self = this;
          System.request('read').then(function(value) {
            self.value = value;
            // assert here does not work.
          });
        }
      };
      var fakeSettingsServer = {
        name: 'fakeSettingsServer',
        read: function() {
          return new Promise(function(resolve) {
            window.setTimeout(function() {
              resolve(2);
            }, 2000);
          });
        }
      };
      client.read();
      System.register('read', fakeSettingsServer);
      clock.tick(2000);
    });
  });
});
