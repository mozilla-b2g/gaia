/* global BaseModule, MockPromise, MocksHelper, MockScreenManager,
          MockWifiManager */
'use strict';


requireApp('system/shared/test/unit/mocks/mock_promise.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/core.js');


var mocksForCore = new MocksHelper([
  'ScreenManager', 'LazyLoader'
]).init();

suite('system/Core', function() {
  mocksForCore.attachTestHelpers();
  var core;
  setup(function() {
    core = new BaseModule.instantiate('Core');
  });

  teardown(function() {
    core.stop();
  });

  test('Should turn on screen on start', function() {
    this.sinon.stub(MockScreenManager, 'turnScreenOn');
    core.start();
    assert.isTrue(MockScreenManager.turnScreenOn.called);
  });

  suite('Start handler', function() {
    var core;
    setup(function() {
      core = new BaseModule.instantiate('Core');
    });

    teardown(function() {
      core.stop();
    });

    test('Defined under window', function() {
      var fakePromise = new MockPromise();
      navigator.newapi = {};
      this.sinon.stub(BaseModule, 'lazyLoad').returns(fakePromise);
      core.startAPIHandler('newapi', 'NewApiHandler');
      window.NewApiHandler = this.sinon.spy();
      fakePromise.mFulfillToValue();
      assert.isTrue(window.NewApiHandler.calledWithNew());
      assert.isTrue(window.NewApiHandler.calledWith(navigator.newapi, core));
    });
  });

  suite('API handler bootstrap', function() {
    var realWifiManager;
    setup(function() {
      realWifiManager = navigator.mozWifiManager;
      navigator.mozWifiManager = MockWifiManager;
      this.sinon.stub(BaseModule, 'lazyLoad', function(args) {
        return Promise.resolve();
      });
      var fakeSettingsCore = {
        start: function() {}
      };
      this.sinon.stub(BaseModule, 'instantiate', function() {
        return fakeSettingsCore;
      });
    });
    teardown(function() {
      navigator.mozWifiManager = realWifiManager;
    });

    test('simple launch with Wifi API', function() {
      this.sinon.stub(core, 'startAPIHandler');
      core.startAPIHandlers();
      assert.isTrue(
        core.startAPIHandler.calledWith('mozWifiManager', 'Wifi'));
    });

    test('Start the API handler for settings', function(done) {
      core.startAPIHandler('mozSettings', 'SettingsCore').then(function() {
        assert.isDefined(core.settingsCore);
        done();
      });
    });
  });

  suite('Launch without API', function() {
    var realSettings, realMobileConnections;
    setup(function() {
      realSettings = navigator.mozSettings;
      navigator.mozSettings = undefined;
      realMobileConnections = navigator.mozMobileConnections;
      navigator.mozMobileConnections = undefined;
      this.sinon.stub(BaseModule, 'lazyLoad', function(args) {
        return Promise.resolve();
      });
    });
    teardown(function() {
      navigator.mozSettings = realSettings;
      navigator.mozMobileConnections = realMobileConnections;
    });
    test('simple launch without Settings API', function() {
      this.sinon.stub(core, 'startAPIHandler');
      core.start();
      assert.isFalse(
        core.startAPIHandler.calledWith('mozSettings', 'SettingsCore'));
    });
  });
});
