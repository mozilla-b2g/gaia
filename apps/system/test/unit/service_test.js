/* globals Service, MocksHelper, MockAppWindowManager */
'use strict';

requireApp('system/test/unit/mock_app_window_manager.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksForService = new MocksHelper([
  'AppWindowManager', 'LazyLoader'
]).init();

suite('system/Service', function() {
  var clock;
  mocksForService.attachTestHelpers();
  setup(function(done) {
    clock = this.sinon.useFakeTimers();
    requireApp('system/js/service.js', done);
    window.appWindowManager = new MockAppWindowManager();
  });

  test('Busy loading if the active app is not loaded.', function() {
    window.appWindowManager.mActiveApp = {
      loaded: false
    };
    assert.isTrue(Service.isBusyLoading());
  });

  suite('States', function() {
    var fakeFtuLauncher;
    setup(function() {
      fakeFtuLauncher = {
        _upgrading: false,
        name: 'FakeFtuLauncher',
        isFtuRunning: false,
        isUpgrading: function() {
          return this._upgrading;
        },
        reachStep: function(step) {
          if (step === '#wifi') {
            return true;
          } else {
            return false;
          }
        }
      };
    });

    teardown(function() {
      Service._states.clear();
      Service._statesByState.clear();
    });

    test('State provider is valid', function() {
      Service.registerState('isFtuRunning', fakeFtuLauncher);
      Service.registerState('isUpgrading', fakeFtuLauncher);
      Service.registerState('reachStep', fakeFtuLauncher);
      assert.equal(Service.query('isFtuRunning'), false);
      assert.equal(Service.query('isUpgrading'), false);
      assert.equal(Service.query('FakeFtuLauncher.isFtuRunning'), false);
      assert.equal(Service.query('FakeFtuLauncher.isUpgrading'), false);
      fakeFtuLauncher.isFtuRunning = true;
      assert.equal(Service.query('isFtuRunning'), true);
      assert.equal(Service.query('FakeFtuLauncher.isFtuRunning'), true);
      fakeFtuLauncher._upgrading = true;
      assert.equal(Service.query('isUpgrading'), true);
      assert.equal(Service.query('FakeFtuLauncher.isUpgrading'), true);
      assert.equal(Service.query('reachStep', '#wifi'), true);
      assert.equal(Service.query('reachStep', '#languages'), false);
    });

    test('State provider is invalid', function() {
      assert.equal(Service.query('isFtuRunning'), undefined);
      assert.equal(Service.query('FakeFtuLauncher.isFtuRunning'), undefined);
    });
  });

  suite('Services', function() {
    teardown(function() {
      Service._services.clear();
      Service._providers.clear();
    });

    suite('Promise in Promise', function() {
      var fakeSettingsServer = {
        get: function() {
          this.promise = new Promise(function(resolve, reject) {
            this.resolve = resolve;
            this.reject = reject;
          }.bind(this));
          return this.promise;
        }
      };

      test('Success', function(done) {
        Service.register('get', fakeSettingsServer);
        Service.request('get').then(function(result) {
          assert.equal(result, 2);
          done();
        });
        fakeSettingsServer.resolve(2);
      });

      test('Error', function(done) {
        Service.register('get', fakeSettingsServer);
        Service.request('get').then(function(result) {
          assert.isFalse(true);
        }).catch(function(error) {
          assert.equal(error, 'uhhhhh');
          done();
        });
        fakeSettingsServer.reject('uhhhhh');
      });

      test('Success: offline and then online', function(done) {
        Service.request('get').then(function(result) {
          assert.equal(result, 3);
          done();
        });
        Service.register('get', fakeSettingsServer);
        fakeSettingsServer.resolve(3);
      });

      test('Error: offline and then online', function(done) {
        Service.request('get').then(function(result) {
          assert.isFalse(true);
        }).catch(function(error) {
          assert.equal(error, 'oooooh');
          done();
        });
        Service.register('get', fakeSettingsServer);
        fakeSettingsServer.reject('oooooh');
      });
    });

    test('Service provider is online.', function(done) {
      var spy = this.sinon.spy();
      var fakeLockscreenWindowManager = {
        lock: spy
      };
      Service.register('lock', fakeLockscreenWindowManager);
      Service.request('lock').then(function() {
        assert.isTrue(spy.called);
        done();
      });
    });

    test('Service provider is offline.', function() {
      Service.request('lock');
      var fakeLockscreenWindowManager = {
        name: 'fakeLWM',
        lock: function() {}
      };
      var stubLock = this.sinon.stub(fakeLockscreenWindowManager, 'lock');
      Service.register('lock', fakeLockscreenWindowManager);
      assert.isTrue(stubLock.called);
    });

    test('Specific service provider is online.', function() {
      var fakeLockscreenWindowManager = {
        name: 'fakeLWM',
        lock: function() {}
      };
      Service.register('lock', fakeLockscreenWindowManager);
      var stubLock = this.sinon.stub(fakeLockscreenWindowManager, 'lock');
      Service.request('fakeLWM:lock');
      assert.isTrue(stubLock.called);
    });

    test('Specific service provider was ever online.', function() {
      var fakeLockscreenWindowManager = {
        name: 'fakeLWM',
        lock: function() {}
      };
      Service.register('lock', fakeLockscreenWindowManager);
      var stubLock = this.sinon.stub(fakeLockscreenWindowManager, 'lock');
      Service.unregister('lock', fakeLockscreenWindowManager);
      Service.request('fakeLWM:lock');
      assert.isFalse(stubLock.called);
    });

    test('Specific service provider is offline.', function() {
      Service.request('fakeLWM:lock');
      var fakeLockscreenWindowManager = {
        name: 'fakeLWM',
        lock: function() {}
      };
      var stubLock = this.sinon.stub(fakeLockscreenWindowManager, 'lock');
      Service.register('lock', fakeLockscreenWindowManager);
      assert.isTrue(stubLock.called);
    });

    test('Passing arguments to specific service provider.', function() {
      var client = {
        value: null,
        observe: function(value) {
          this.value = value;
        }
      };
      Service.request('addObserver', client);
      var fakeSettingsServer = {
        name: 'fakeSettingsServer',
        addObserver: function(client) {
          this.client = client;
        }
      };
      Service.register('addObserver', fakeSettingsServer);
      fakeSettingsServer.client.observe(2);
      assert.equal(client.value, 2);
    });

    test('Chaining promises.', function(done) {
      var client = {
        value: 1,
        read: function(value) {
          var self = this;
          Service.request('read').then(function(value) {
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
      Service.register('read', fakeSettingsServer);
    });
  });
});
