/* global BaseModule, MockPromise */
'use strict';


requireApp('system/shared/test/unit/mocks/mock_promise.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/core.js');

suite('system/Core', function() {
  var core;
  setup(function() {
    core = new BaseModule.instantiate('Core');
  });

  teardown(function() {
    core.stop();
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
    var realSettings, fakeSettings = {};
    setup(function() {
      realSettings = navigator.mozSettings;
      navigator.mozSettings = fakeSettings;
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
      navigator.mozSettings = realSettings;
    });

    test('simple launch with Settings API', function() {
      this.sinon.stub(core, 'startAPIHandler');
      core.start();
      assert.isTrue(
        core.startAPIHandler.calledWith('mozSettings', 'SettingsCore'));
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
