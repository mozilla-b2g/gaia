/* global FtuLauncher, VersionHelper,
          MockasyncStorage, MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/version_helper.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
requireApp('system/js/ftu_launcher.js');

suite('launch ftu >', function() {
  var realAsyncStorage, realMozSettings, realFtuPing;

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

  suite('stepReady', function() {
    setup(function() {
      FtuLauncher._stepsList = [];
      FtuLauncher._done = false;
      FtuLauncher._skipped = false;
    });
    test('When FTU is closed, any step should be ready', function(done) {
      FtuLauncher.close();
      FtuLauncher.stepReady('#wifi').then(function() {
        done();
      });
    });
    test('When FTU is skipped, any step should be ready', function(done) {
      FtuLauncher.skip();
      FtuLauncher.stepReady('#wifi').then(function() {
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
      FtuLauncher.handleEvent(evt);
      FtuLauncher.stepReady('#languages').then(function() {
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
      FtuLauncher.handleEvent(evt);
      var evt2 = new CustomEvent('iac-ftucomms', {
        detail: {
          type: 'step',
          hash: '#wifi'
        }
      });
      FtuLauncher.handleEvent(evt2);
      FtuLauncher.stepReady('#wifi').then(function() {
        done();
      });
    });
  });
});
