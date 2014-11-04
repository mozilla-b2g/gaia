/* global MockPromise, BaseModule */
'use strict';

require('/shared/test/unit/mocks/mock_promise.js');

suite('system/Core', function() {
  setup(function(done) {
    requireApp('system/js/base_module.js');
    requireApp('system/js/system.js');
    requireApp('system/js/core.js', done);
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
    var core;
    setup(function() {
      core = new BaseModule.instantiate('Core');
    });

    teardown(function() {
      core.stop();
    });

    test('simple launch with Settings API', function() {
      var realSettings = navigator.mozSettings;
      var fakePromise = new MockPromise();
      navigator.mozSettings = {};
      this.sinon.stub(BaseModule, 'lazyLoad', function() {
        return fakePromise;
      });
      var fakeSettingsCore = {
        start: function() {}
      };
      this.sinon.stub(BaseModule, 'instantiate', function() {
        return fakeSettingsCore;
      });
      core.start();
      fakePromise.mFulfillToValue();
      assert.isDefined(core.settingsCore);
      navigator.mozSettings = realSettings;
    });

    test('simple launch without Settings API', function() {
      var realSettings = navigator.mozSettings;
      navigator.mozSettings = undefined;
      var stubLazyLoad = this.sinon.stub(BaseModule, 'lazyLoad');
      core.start();
      assert.isFalse(stubLazyLoad.called);
      assert.isUndefined(core.settingsCore);
      navigator.mozSettings = realSettings;
    });
  });
});
