/* global VersionHelper, BaseModule, MocksHelper, SettingsMigrator,
          MockasyncStorage, MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/version_helper.js');
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
  });

  setup(function() {
    window.SettingsMigrator = function() {};
    SettingsMigrator.prototype.start = function() {};
    subject = BaseModule.instantiate('FtuLauncher');
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
    test('ftu ping is called', function() {
      var fakePromise = {
        then: sinon.stub()
      };

      this.sinon.stub(VersionHelper, 'getVersionInfo').returns(fakePromise);
      subject.start();
      assert.ok(subject.getFtuPing().ensurePingCalled);
    });
  });

  suite('stepReady', function() {
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
});
