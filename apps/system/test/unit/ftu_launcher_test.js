/* global FtuLauncher, VersionHelper,
          MockasyncStorage, MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/version_helper.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
requireApp('system/js/ftu_launcher.js');

suite('launch ftu >', function() {
  var realAsyncStorage, realMozSettings, realFtuPing;

  var mockIACFTUCommsStartedEvent = {
    type: 'iac-ftucomms',
    detail: 'started'
  };
  var mockIACFTUCommsStepEvent = {
    type: 'iac-ftucomms',
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
  });

  suiteTeardown(function() {
    window.asyncStorage = realAsyncStorage;
    navigator.mozSettings = realMozSettings;
    window.FtuPing = realFtuPing;
  });

  suite('ftu.enabled >', function() {
    setup(function() {
      navigator.mozSettings.mSettings['deviceinfo.os'] = '2.0.1.whatever';
    });
    test('launch when enabled (upgrade)', function(done) {
      MockasyncStorage.mItems['ftu.enabled'] = true;
      navigator.mozSettings
        .mSettings['deviceinfo.previous_os'] = '1.4.1.whatever';
      function onOutcome(name) {
        assert.equal(name, 'launch', 'FtuLauncher.launch was called');
        assert.isTrue(FtuLauncher.isFtuUpgrading());
        done();
      }
      this.sinon.stub(FtuLauncher, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(FtuLauncher, 'skip', function() {
        onOutcome('skip');
      });
      FtuLauncher.retrieve();
    });
    test('launch when enabled (no upgrade)', function(done) {
      MockasyncStorage.mItems['ftu.enabled'] = true;
      navigator.mozSettings
        .mSettings['deviceinfo.previous_os'] = '2.0.1.whatever';
      function onOutcome(name) {
        assert.equal(name, 'launch', 'FtuLauncher.launch was called');
        assert.isFalse(FtuLauncher.isFtuUpgrading());
        done();
      }
      this.sinon.stub(FtuLauncher, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(FtuLauncher, 'skip', function() {
        onOutcome('skip');
      });
      FtuLauncher.retrieve();
    });
    test('dont launch when not enabled (no upgrade)', function(done) {
      MockasyncStorage.mItems['ftu.enabled'] = false;
      navigator.mozSettings
        .mSettings['deviceinfo.previous_os'] = '2.0.1.whatever';
      function onOutcome(name) {
        assert.equal(name, 'skip', 'FtuLauncher.skip was called');
        assert.isFalse(FtuLauncher.isFtuUpgrading());
        done();
      }
      this.sinon.stub(FtuLauncher, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(FtuLauncher, 'skip', function() {
        onOutcome('skip');
      });
      FtuLauncher.retrieve();
    });
    test('launch when not enabled (upgrade)', function(done) {
      MockasyncStorage.mItems['ftu.enabled'] = false;
      navigator.mozSettings
        .mSettings['deviceinfo.previous_os'] = '1.4.1.whatever';
      function onOutcome(name) {
        assert.equal(name, 'launch', 'FtuLauncher.launch was called');
        assert.isTrue(FtuLauncher.isFtuUpgrading());
        done();
      }
      this.sinon.stub(FtuLauncher, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(FtuLauncher, 'skip', function() {
        onOutcome('skip');
      });
      FtuLauncher.retrieve();
    });
    test('ftu ping is called', function() {
      var fakePromise = {
        then: sinon.stub()
      };

      this.sinon.stub(VersionHelper, 'getVersionInfo').returns(fakePromise);

      FtuLauncher.retrieve();
      assert.ok(FtuLauncher.getFtuPing().ensurePingCalled);
    });
  });

  suite('_handle_iac-ftucomms', function() {
    var publishStub;
    setup(function() {
      publishStub = this.sinon.stub(FtuLauncher, 'publish');
    });

    test('handle started event', function() {
      FtuLauncher.handleEvent(mockIACFTUCommsStartedEvent);
      assert.isTrue(publishStub.calledWith('started'));
    });

    test('handle step event', function() {
      FtuLauncher.handleEvent(mockIACFTUCommsStepEvent);
      assert.isTrue(publishStub.calledWith('step'));
    });
  });

  suite('whats new ftu >', function() {
    setup(function() {
      MockasyncStorage.mItems['ftu.enabled'] = false;
      var mockSettings = navigator.mozSettings.mSettings;
      mockSettings['deviceinfo.previous_os'] = '1.3.0.prerelease';
      mockSettings['deviceinfo.os'] = '2.0.1.whatever';
    });

    test(' upgrade tutorial launched', function(done) {
      function onOutcome(name) {
        assert.isTrue(FtuLauncher.isFtuUpgrading());
        assert.equal(name, 'launch', 'FtuLauncher.launch was called');
        assert.isTrue(FtuLauncher.isFtuUpgrading());
        done();
      }
      this.sinon.stub(FtuLauncher, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(FtuLauncher, 'skip', function() {
        onOutcome('skip');
      });
      FtuLauncher.retrieve();
    });
  });
});
