/* global FtuLauncher,
          MockasyncStorage, MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/version_helper.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
requireApp('system/js/ftu_launcher.js');

suite('launch ftu >', function() {
  var realAsyncStorage, realMozSettings, realFtuPing;
  var MockFtuPing = {
    ensurePing: function(){}
  };

  suiteSetup(function() {
    realFtuPing = window.FtuPing;
    realAsyncStorage = window.asyncStorage;
    realMozSettings = navigator.mozSettings;
    window.asyncStorage = MockasyncStorage;
    navigator.mozSettings = MockNavigatorSettings;
    window.FtuPing = MockFtuPing;

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

  suite('whats new ftu >', function() {
    setup(function() {
      MockasyncStorage.mItems['ftu.enabled'] = false;
      var mockSettings = navigator.mozSettings.mSettings;
      mockSettings['deviceinfo.previous_os'] = '1.3.0.prerelease';
      mockSettings['deviceinfo.os'] = '2.0.1.whatever';
    });

    test(' upgrade tutorial launched', function(done) {
      function onOutcome(name) {
        assert.equal(name, 'launch', 'FtuLauncher.launch was called');
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
