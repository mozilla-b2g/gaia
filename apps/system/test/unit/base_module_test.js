/* global BaseModule, MocksHelper, MockService, MockLazyLoader, MockPromise */
'use strict';

require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksForBaseModule = new MocksHelper([
  'LazyLoader', 'Service'
]).init();

suite('system/BaseModule', function() {
  mocksForBaseModule.attachTestHelpers();

  setup(function(done) {
    requireApp('system/js/base_module.js', done);
  });

  test('lowercase capital', function() {
    assert.equal('appWindowManager',
      BaseModule.lowerCapital('AppWindowManager'));
  });

  test('parse module path', function() {
    var module = BaseModule.parsePath('path/to/ModuleName');
    assert.equal(module.path, 'path/to/');
    assert.equal(module.name, 'ModuleName');
  });

  test('object name to file name', function() {
    assert.deepEqual('/js/app_window_manager.js',
      BaseModule.object2fileName('AppWindowManager'));
    assert.deepEqual('/js/path/to/module_name.js',
      BaseModule.object2fileName('path/to/ModuleName'));
  });

  test('lazy load from an array of submodule strings', function(done) {
    var stubLoad = this.sinon.stub(MockLazyLoader, 'load');
    BaseModule.lazyLoad(['AppWindowManager']).then(function() {
      done();
    });
    assert.isTrue(stubLoad.calledWith(['/js/app_window_manager.js']));
    stubLoad.yield();
  });

  suite('BaseModule.instantiate', function() {
    test('Get a new instance if the module is available', function() {
      var InstantiationTester = function() {};
      BaseModule.create(InstantiationTester, {
        name: 'InstantiationTester'
      });

      assert.isDefined(BaseModule.instantiate('InstantiationTester'));
      assert.equal(BaseModule.instantiate('InstantiationTester').name,
        'InstantiationTester');
    });

    test('Get undefined if the module is unavailable', function() {
      assert.isUndefined(BaseModule.instantiate('NoSuchModule'));
    });
  });

  suite('Centralized settins observer', function() {
    var fakeAppWindowManager, settings;
    setup(function() {
      var FakeAppWindowManager = function() {};
      FakeAppWindowManager.SETTINGS = ['app-suspending.enabled'];
      BaseModule.create(FakeAppWindowManager, {
        name: 'FakeAppWindowManager'
      });
      settings = {
        'app-suspending.enabled': true
      };
      fakeAppWindowManager = new FakeAppWindowManager();
    });

    teardown(function() {
      fakeAppWindowManager.stop();
    });

    test('addObserver will be called if SETTINGS is specified', function(done) {
      var spy = this.sinon.stub(fakeAppWindowManager, 'observe');
      this.sinon.stub(MockService, 'request',
        function(service, name, consumer) {
          if (service === 'SettingsCore:addObserver') {
            assert.equal(name, 'app-suspending.enabled');
            assert.deepEqual(consumer, fakeAppWindowManager);
            consumer.observe(name, settings[name]);
            assert.isTrue(spy.calledWith('app-suspending.enabled', true));
            done();
          }
        });

      fakeAppWindowManager.start();
    });

    test('get settings', function(done) {
      this.sinon.stub(MockService, 'request').returns(
        new Promise(function(resolve) {
          resolve(new Promise(function(iresolve) {
            iresolve(true);
          }));
        }));

      fakeAppWindowManager.readSetting('app-suspending.enabled')
        .then(function(value) {
          assert.equal(value, true);
          done();
        });
    });

    test('set settings', function(done) {
      this.sinon.stub(MockService, 'request',
        function(service, object) {
          for (var key in object) {
            settings[key] = object[key];
          }
          assert.equal(settings['app-suspending.enabled'], false);
          done();
        });

      fakeAppWindowManager.writeSetting({'app-suspending.enabled': false});
    });

    test('settings relation function will not be injected if not specified',
      function() {
        var fakeAppWindowManager2;
        var FakeAppWindowManager2 = function() {};
        BaseModule.create(FakeAppWindowManager2, {
          name: 'FakeAppWindowManager2'
        });
        fakeAppWindowManager2 = new FakeAppWindowManager2();
        assert.isUndefined(fakeAppWindowManager2.observe);
        assert.isUndefined(fakeAppWindowManager2._observeSettings);
        assert.isUndefined(fakeAppWindowManager2._unobserveSettings);
      });
  });

  suite('Centralized event handler', function() {
    var fakeAppWindowManager;
    setup(function() {
      var FakeAppWindowManager = function() {};
      FakeAppWindowManager.EVENTS = ['ftuskip'];
      BaseModule.create(FakeAppWindowManager, {
        name: 'FakeAppWindowManager'
      });
      fakeAppWindowManager = new FakeAppWindowManager();
    });
    teardown(function() {
      fakeAppWindowManager.stop();
    });

    test('handleEvent should be called when registering events', function() {
      var stubHandleEvent =
        this.sinon.stub(fakeAppWindowManager, 'handleEvent');
      window.dispatchEvent(new CustomEvent('ftuskip'));
      assert.isFalse(stubHandleEvent.called);
      fakeAppWindowManager.start();
      var ftuskipEvent = new CustomEvent('ftuskip');
      window.dispatchEvent(ftuskipEvent);
      assert.isTrue(stubHandleEvent.calledWith(ftuskipEvent));
    });

    test('specific handler should be called if it exists', function() {
      var stubHandleFtuskip =
        fakeAppWindowManager._handle_ftuskip = this.sinon.spy();
      window.dispatchEvent(new CustomEvent('ftuskip'));
      assert.isFalse(stubHandleFtuskip.called);
      fakeAppWindowManager.start();
      var ftuskipEvent = new CustomEvent('ftuskip');
      window.dispatchEvent(ftuskipEvent);
      assert.isTrue(stubHandleFtuskip.calledWith(ftuskipEvent));
    });

    test('pre handler should be called if it exists', function() {
      var spy = fakeAppWindowManager._handle_ftuskip = this.sinon.spy();
      var ftuskipEvent = new CustomEvent('ftuskip');
      window.dispatchEvent(ftuskipEvent);
      assert.isFalse(spy.called);
      fakeAppWindowManager.start();
      window.dispatchEvent(ftuskipEvent);
      assert.isTrue(spy.calledWith(ftuskipEvent));
    });

    test('pre handler should be called if it exists', function() {
      var spy = fakeAppWindowManager._pre_handleEvent = this.sinon.spy();
      var spyFtuskip = fakeAppWindowManager._handle_ftuskip = this.sinon.spy();
      var ftuskipEvent = new CustomEvent('ftuskip');
      window.dispatchEvent(ftuskipEvent);
      assert.isFalse(spy.called);
      assert.isFalse(spyFtuskip.called);
      fakeAppWindowManager.start();
      window.dispatchEvent(ftuskipEvent);
      assert.isTrue(spy.calledWith(ftuskipEvent));
      assert.isTrue(spyFtuskip.calledWith(ftuskipEvent));
    });

    test('specific event handler should be not called ' +
          'if pre handler returns false', function() {
      fakeAppWindowManager._pre_handleEvent = function() {};
      var spy = this.sinon.stub(fakeAppWindowManager,
        '_pre_handleEvent').returns(false);
      var spyFtuskip = fakeAppWindowManager._handle_ftuskip = this.sinon.spy();
      var ftuskipEvent = new CustomEvent('ftuskip');

      window.dispatchEvent(ftuskipEvent);
      assert.isFalse(spy.called);
      assert.isFalse(spyFtuskip.called);
      fakeAppWindowManager.start();
      window.dispatchEvent(ftuskipEvent);
      assert.isTrue(spy.calledWith(ftuskipEvent));
      assert.isFalse(spyFtuskip.calledWith(ftuskipEvent));
    });

    test('post handler should be called if it exists', function() {
      var spy = fakeAppWindowManager._post_handleEvent = this.sinon.spy();
      var ftuskipEvent = new CustomEvent('ftuskip');
      window.dispatchEvent(ftuskipEvent);
      assert.isFalse(spy.called);
      fakeAppWindowManager.start();
      window.dispatchEvent(ftuskipEvent);
      assert.isTrue(spy.calledWith(ftuskipEvent));
    });

    test('event relation function will not be injected if not specified',
      function() {
        var FakeAppWindowManager2 = function() {};
        BaseModule.create(FakeAppWindowManager2, {
          name: 'FakeAppWindowManager2'
        });
        var fakeAppWindowManager2 = new FakeAppWindowManager2();
        assert.isUndefined(fakeAppWindowManager2.handleEvent);
        assert.isUndefined(fakeAppWindowManager2._pre_handleEvent);
        assert.isUndefined(fakeAppWindowManager2._post_handleEvent);
        assert.isUndefined(fakeAppWindowManager2._subscribeEvents);
        assert.isUndefined(fakeAppWindowManager2._unsubscribeEvents);
      });
  });

  suite('Submodule management', function() {
    var fakeAppWindowManager, fakeSubModule, fakePromise;
    setup(function() {
      fakePromise = new MockPromise();
      this.sinon.stub(BaseModule, 'lazyLoad', function() {
        return fakePromise;
      });
      window.FakeAppWindowManager = function() {};
      window.FakeAppWindowManager.SUB_MODULES = [
        'FakeTaskManager',
        'path/to/FakeSubModule'
      ];
      BaseModule.create(window.FakeAppWindowManager, {
        name: 'FakeAppWindowManager'
      });
      window.FakeTaskManager = function() {};
      BaseModule.create(window.FakeTaskManager, {
        name: 'FakeTaskManager'
      });
      fakeAppWindowManager = new window.FakeAppWindowManager();
      fakeAppWindowManager.start();
      window.FakeSubModule = function() {};
      BaseModule.create(window.FakeSubModule, {
        name: 'FakeSubModule'
      });
      fakeSubModule = new window.FakeSubModule();
      fakeSubModule.start();
    });

    teardown(function() {
      fakeAppWindowManager.stop();
      window.FakeTaskManager = null;
      window.FakeAppWindowManager = null;
    });

    test('submodule should be loaded', function() {
      var spy = fakeAppWindowManager._fakeTaskManager_loaded = this.sinon.spy();
      var spy2 = fakeAppWindowManager._fakeSubModule_loaded = this.sinon.spy();
      fakePromise.mFulfillToValue();
      assert.isDefined(fakeAppWindowManager.fakeTaskManager);
      assert.isTrue(spy.called);
      assert.isDefined(fakeAppWindowManager.fakeSubModule);
      assert.isTrue(spy2.called);
    });

    test('submodule loaded handler should be called if it exists', function() {
      var spy = fakeAppWindowManager._fakeTaskManager_loaded = this.sinon.spy();
      fakePromise.mFulfillToValue();
      assert.isDefined(fakeAppWindowManager.fakeTaskManager);
      assert.isTrue(spy.called);
    });

    test('submodule should be started once parent is started', function() {
      var spyStart = this.sinon.stub(window.FakeTaskManager.prototype, 'start');
      fakePromise.mFulfillToValue();
      assert.isTrue(spyStart.called);
    });

    test('submodule should be stopped once parent is stopped', function() {
      fakePromise.mFulfillToValue();
      var spyStop =
        this.sinon.stub(fakeAppWindowManager.fakeTaskManager, 'stop');
      var spyStop2 =
        this.sinon.stub(fakeAppWindowManager.fakeSubModule, 'stop');

      fakeAppWindowManager.stop();
      assert.isTrue(spyStop.called);
      assert.isTrue(spyStop2.called);
    });

    test('submodule should not be started if the parent is already stopped',
      function() {
        var spyStart =
          this.sinon.stub(window.FakeTaskManager.prototype, 'start');
        fakeAppWindowManager.stop();
        fakePromise.mFulfillToValue();
        assert.isFalse(spyStart.called);
      });
  });

  suite('Service registration', function() {
    var fakeAppWindowManager;
    setup(function() {
      var FakeAppWindowManager = function() {};
      FakeAppWindowManager.SERVICES = ['isBusyLoading'];
      BaseModule.create(FakeAppWindowManager, {
        name: 'FakeAppWindowManager',
        isBusyLoading: function() {}
      });
      fakeAppWindowManager = new FakeAppWindowManager();
      fakeAppWindowManager.start();
    });
    teardown(function() {
      fakeAppWindowManager.stop();
    });

    test('register/unregister functions should be injected', function() {
      assert.isDefined(fakeAppWindowManager._registerServices);
      assert.isDefined(fakeAppWindowManager._unregisterServices);
    });

    test('Should register service to System when starting', function() {
      fakeAppWindowManager.stop();
      var stubRegister = this.sinon.stub(MockService, 'register');
      fakeAppWindowManager.start();
      assert.isTrue(stubRegister.calledWith('isBusyLoading',
        fakeAppWindowManager));
    });

    test('Should unregister service to System when stopping', function() {
      var stubRegister = this.sinon.stub(MockService, 'unregister');
      fakeAppWindowManager.stop();
      assert.isTrue(stubRegister.calledWith('isBusyLoading',
        fakeAppWindowManager));
    });

    test('Should not inject service registration functions', function() {
      var FakeAppWindowManager2 = function() {};
      BaseModule.create(FakeAppWindowManager2, {
        name: 'FakeAppWindowManager2',
        isBusyLoading: function() {}
      });
      var fakeAppWindowManager2 = new FakeAppWindowManager2();
      assert.isUndefined(fakeAppWindowManager2._registerServices);
      assert.isUndefined(fakeAppWindowManager2._unregisterServices);
    });
  });

  suite('State registration', function() {
    var fakeFtuLauncher;
    setup(function() {
      var FakeFtuLauncher = function() {};
      FakeFtuLauncher.STATES = ['isUpgrading'];
      BaseModule.create(FakeFtuLauncher, {
        _upgrading: false,
        name: 'FakeFtuLauncher',
        isUpgrading: function() {
          return this._upgrading;
        }
      });
      fakeFtuLauncher = new FakeFtuLauncher();
      fakeFtuLauncher.start();
    });

    teardown(function() {
      fakeFtuLauncher.stop();
    });

    test('Should register service to System when starting', function() {
      fakeFtuLauncher.stop();
      var stubRegister = this.sinon.stub(MockService, 'registerState');
      fakeFtuLauncher.start();
      assert.isTrue(stubRegister.calledWith('isUpgrading',
        fakeFtuLauncher));
    });

    test('Should unregister service to System when stopping', function() {
      var stubRegister = this.sinon.stub(MockService, 'unregisterState');
      fakeFtuLauncher.stop();
      assert.isTrue(stubRegister.calledWith('isUpgrading',
        fakeFtuLauncher));
    });

    test('Should not inject service registration functions', function() {
      var FakeFtuLauncher2 = function() {};
      BaseModule.create(FakeFtuLauncher2, {
        name: 'FakeFtuLauncher2',
        isUpgrading: function() {}
      });
      var fakeFtuLauncher2 = new FakeFtuLauncher2();
      this.sinon.stub(MockService, 'registerState');
      this.sinon.stub(MockService, 'unregisterState');
      fakeFtuLauncher2.start();
      assert.isFalse(MockService.registerState.called);
      fakeFtuLauncher2.stop();
      assert.isFalse(MockService.unregisterState.called);
    });
  });

  suite('Import', function() {
    var importTester;
    setup(function() {
      var ImportTester = function() {};
      ImportTester.IMPORTS = ['BModule', 'CModule'];
      BaseModule.create(ImportTester, {
        name: 'ImportTester',
        _start: function() {}
      });
      importTester = new ImportTester();
    });

    teardown(function() {
      importTester.stop();
    });

    test('Module start will be executed until import loaded', function() {
      var stubLoad = this.sinon.stub(MockLazyLoader, 'load');
      var stubCustomStart = this.sinon.stub(importTester, '_start');
      importTester.start();
      assert.isTrue(stubLoad.called);
      assert.isFalse(stubCustomStart.called);
      stubLoad.yield();
      assert.isTrue(stubCustomStart.called);
    });
  });

  suite('Module life cycle control', function() {
    var lifeCycleTester;
    setup(function() {
      var LifeCycleTester = function() {};
      BaseModule.create(LifeCycleTester, {
        name: 'LifeCycleTester',
        _start: function() {},
        _stop: function() {}
      });

      lifeCycleTester = new LifeCycleTester();
    });

    teardown(function() {
      lifeCycleTester.stop();
    });

    test('custom start should be triggered', function() {
      var spy = this.sinon.stub(lifeCycleTester, '_start');
      lifeCycleTester.start();
      assert.isTrue(spy.calledOnce);
    });

    test('custom start will not execute if already started', function() {
      lifeCycleTester.start();
      var spy = this.sinon.stub(lifeCycleTester, '_start');
      lifeCycleTester.start();
      assert.isFalse(spy.called);
    });

    test('custom stop should be triggered', function() {
      var spy = this.sinon.stub(lifeCycleTester, '_stop');
      lifeCycleTester.start();
      lifeCycleTester.stop();
      assert.isTrue(spy.calledOnce);
    });

    test('custom stop will not execute if already stopped', function() {
      lifeCycleTester.start();
      lifeCycleTester.stop();
      var spy = this.sinon.stub(lifeCycleTester, '_stop');
      lifeCycleTester.stop();
      assert.isFalse(spy.called);
    });
  });
});
