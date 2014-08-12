/* global ftuLauncher, FtuLauncher,
          MockasyncStorage, MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/version_helper.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
requireApp('system/js/system.js');
requireApp('system/js/base_module.js');
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
      this.start = function() { this.ensurePingCalled = true; };
    };
    window.ftuLauncher = new FtuLauncher();
    window.ftuLauncher.start();
  });

  suiteTeardown(function() {
    window.ftuLauncher.stop();
    window.ftuLauncher = null;
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
      this.sinon.stub(ftuLauncher, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(ftuLauncher, 'skip', function() {
        onOutcome('skip');
      });
      ftuLauncher.retrieve();
    });
    test('launch when enabled (no upgrade)', function(done) {
      MockasyncStorage.mItems['ftu.enabled'] = true;
      navigator.mozSettings
        .mSettings['deviceinfo.previous_os'] = '2.0.1.whatever';
      function onOutcome(name) {
        assert.equal(name, 'launch', 'FtuLauncher.launch was called');
        done();
      }
      this.sinon.stub(ftuLauncher, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(ftuLauncher, 'skip', function() {
        onOutcome('skip');
      });
      ftuLauncher.retrieve();
    });
    test('dont launch when not enabled (no upgrade)', function(done) {
      MockasyncStorage.mItems['ftu.enabled'] = false;
      navigator.mozSettings
        .mSettings['deviceinfo.previous_os'] = '2.0.1.whatever';
      function onOutcome(name) {
        assert.equal(name, 'skip', 'ftuLauncher.skip was called');
        done();
      }
      this.sinon.stub(ftuLauncher, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(ftuLauncher, 'skip', function() {
        onOutcome('skip');
      });
      ftuLauncher.retrieve();
    });
    test('launch when not enabled (upgrade)', function(done) {
      MockasyncStorage.mItems['ftu.enabled'] = false;
      navigator.mozSettings
        .mSettings['deviceinfo.previous_os'] = '1.4.1.whatever';
      function onOutcome(name) {
        assert.equal(name, 'launch', 'FtuLauncher.launch was called');
        done();
      }
      this.sinon.stub(ftuLauncher, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(ftuLauncher, 'skip', function() {
        onOutcome('skip');
      });
      ftuLauncher.retrieve();
    });
    test('ftu ping is called', function() {
      ftuLauncher.retrieve();
      assert.ok(ftuLauncher.getFtuPing().ensurePingCalled);
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
      this.sinon.stub(ftuLauncher, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(ftuLauncher, 'skip', function() {
        onOutcome('skip');
      });
      ftuLauncher.retrieve();
    });
  });
});
