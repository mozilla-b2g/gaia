/* global MocksHelper, BaseModule, MockApplications,
          MockLazyLoader, App */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/launcher.js');
requireApp('system/js/core.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/js/app.js');

var mocksForLauncher = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/app', function() {
  var subject;
  mocksForLauncher.attachTestHelpers();
  var FakeLauncher, FakeSettingsCore, FakeCore;
  var fakeLauncherStartDeferred;
  var fakeApplicationReadyDeferred;
  var fakeLazyLoaderDeferred;
  var fakeCoreStartDeferred;

  var Deferred = function() {
    this.promise = new Promise(function(resolve, reject) {
      this.resolve = resolve;
      this.reject = reject;
    }.bind(this));

    return this;
  };

  suiteSetup(function() {
    window.applications = MockApplications;
  });

  suiteTeardown(function() {
    delete window.applications;
  });

  setup(function() {
    fakeLazyLoaderDeferred = new Deferred();
    fakeLauncherStartDeferred = new Deferred();
    fakeApplicationReadyDeferred = new Deferred();
    fakeCoreStartDeferred = new Deferred();
    this.sinon.stub(MockLazyLoader, 'load').returns(
      fakeLauncherStartDeferred.promise);
    FakeCore = {
      start: sinon.spy(function() {
        return fakeCoreStartDeferred.promise;
      })
    };
    FakeSettingsCore = {
      start: this.sinon.spy()
    };
    FakeLauncher = {
      start: sinon.spy(function() {
        return fakeLauncherStartDeferred.promise;
      })
    };
    subject = new App();
    this.sinon.stub(MockApplications, 'waitForReady').returns(
      fakeApplicationReadyDeferred.promise);
    this.sinon.stub(BaseModule, 'instantiate', function(name) {
      switch (name) {
        case 'Core':
          return FakeCore;
        case 'SettingsCore':
          return FakeSettingsCore;
        case 'Launcher':
          return FakeLauncher;
      }
    });
  });

  test('Should launch SettingsCore, Launcher, Core', function(done) {
    subject.start().then(done, done);
    fakeLazyLoaderDeferred.resolve();
    fakeApplicationReadyDeferred.resolve();
    fakeLauncherStartDeferred.resolve();
    fakeCoreStartDeferred.resolve();
    Promise.all([
      fakeApplicationReadyDeferred.promise,
      fakeLauncherStartDeferred.promise
    ]).then(function() {
      assert.isDefined(window.core);
    });
  });
});
