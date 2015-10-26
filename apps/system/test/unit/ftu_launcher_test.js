  /* global BaseModule, MocksHelper, SettingsMigrator,
          MockasyncStorage, MockNavigatorSettings, MockPromise,
          FtuLateCustomization */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/version_helper.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
require('/apps/system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/ftu_launcher.js');

var mocksForFtuLauncher = new MocksHelper([
  'LazyLoader',
]).init();

suite('launch ftu >', function() {

  mocksForFtuLauncher.attachTestHelpers();
  var realAsyncStorage, realMozSettings, realFtuPing, subject;
  var startAllPromise;


  var mockIACFTUCommsStartedEvent = {
    detail: 'started'
  };
  var mockIACFTUCommsStepEvent = {
    detail: { type: 'step' }
  };

  suiteSetup(function() {
    realFtuPing = window.FtuPing;
    realAsyncStorage = window.asyncStorage;
    realMozSettings = navigator.mozSettings;
    window.asyncStorage = MockasyncStorage;
    navigator.mozSettings = MockNavigatorSettings;
    window.FtuPing = function() {
      this.ensurePingCalled = false;
      this.ensurePing = function() { this.ensurePingCalled = true; };
    };
    window.FtuLateCustomization = function() {
      this.start = sinon.stub();
      this.stop = sinon.stub();
      FtuLateCustomization.instance = this;
    };
  });

  setup(function() {
    window.SettingsMigrator = function() {};
    SettingsMigrator.prototype.start = function() {};
    subject = BaseModule.instantiate('FtuLauncher');
    startAllPromise = new MockPromise();
    this.sinon.stub(Promise, 'all').returns(startAllPromise);
    subject.start();
  });

  teardown(function() {
    window.SettingsMigrator = null;
    subject.stop();
  });

  suiteTeardown(function() {
    window.asyncStorage = realAsyncStorage;
    navigator.mozSettings = realMozSettings;
    window.FtuPing = realFtuPing;
  });

  suite('ftu.enabled >', function() {
    setup(function() {
      startAllPromise.mFulfillToValue([]);
    });
    test('ftu ping is called', function() {
      assert.ok(subject.getFtuPing().ensurePingCalled);
    });
  });

  suite('_handle_iac-ftucomms', function() {
    setup(function() {
      startAllPromise.mFulfillToValue([]);
    });
    var publishStub;
    setup(function() {
      publishStub = this.sinon.stub(subject, 'publish');
    });

    test('dont publish ftustarted on ftucomms started event', function() {
      subject['_handle_iac-ftucomms'](mockIACFTUCommsStartedEvent);
      assert.isFalse(publishStub.calledWith('started'));
    });

    test('handle step event', function() {
      subject['_handle_iac-ftucomms'](mockIACFTUCommsStepEvent);
      assert.isTrue(publishStub.calledWith('step'));
    });
  });

  suite('stepReady', function() {
    setup(function() {
      startAllPromise.mFulfillToValue([]);
    });
    test('When FTU is closed, any step should be ready', function(done) {
      subject.close();
      subject.stepReady('#wifi').then(function() {
        done();
      });
    });
    test('When FTU is skipped, any step should be ready', function(done) {
      subject.skip();
      subject.stepReady('#wifi').then(function() {
        done();
      });
    });
    test('Navigator to #languages', function(done) {
      var evt = new CustomEvent('iac-ftucomms', {
        detail: {
          type: 'step',
          hash: '#languages'
        }
      });
      subject.handleEvent(evt);
      subject.stepReady('#languages').then(function() {
        done();
      });
    });

    test('Navigate to wifi', function(done) {
      var evt = new CustomEvent('iac-ftucomms', {
        detail: {
          type: 'step',
          hash: '#languages'
        }
      });
      subject.handleEvent(evt);
      var evt2 = new CustomEvent('iac-ftucomms', {
        detail: {
          type: 'step',
          hash: '#wifi'
        }
      });
      subject.handleEvent(evt2);
      subject.stepReady('#wifi').then(function() {
        done();
      });
    });
  });

  suite('Late Customization', function() {
    var customizationUrl = 'http://foo.com/api/operator/';
    setup(function() {
      startAllPromise.mFulfillToValue([customizationUrl]);
    });

    test('start', function() {
      assert.ok(subject.isFtuCustomizing());
      assert.ok(FtuLateCustomization.instance &&
                FtuLateCustomization.instance.start.calledOnce);
    });

    test('skip', function() {
      subject.skip();
      assert.ok(FtuLateCustomization.instance.stop.calledOnce);
      assert.isFalse(subject.isFtuCustomizing());
    });

    test('done', function() {
      subject.skip();
      assert.ok(FtuLateCustomization.instance.stop.calledOnce);
      assert.isFalse(subject.isFtuCustomizing());
    });
  });
});
