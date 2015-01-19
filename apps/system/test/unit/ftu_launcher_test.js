/* global VersionHelper, BaseModule,
          MockasyncStorage, MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/version_helper.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/ftu_launcher.js');

suite('launch ftu >', function() {
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
    subject = BaseModule.instantiate('FtuLauncher');
    subject.start();
  });

  teardown(function() {
    subject.stop();
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
        assert.equal(name, 'launch', 'subject.launch was called');
        assert.isTrue(subject.isFtuUpgrading());
        done();
      }
      this.sinon.stub(subject, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(subject, 'skip', function() {
        onOutcome('skip');
      });
      subject.retrieve();
    });
    test('launch when enabled (no upgrade)', function(done) {
      MockasyncStorage.mItems['ftu.enabled'] = true;
      navigator.mozSettings
        .mSettings['deviceinfo.previous_os'] = '2.0.1.whatever';
      function onOutcome(name) {
        assert.equal(name, 'launch', 'subject.launch was called');
        assert.isFalse(subject.isFtuUpgrading());
        done();
      }
      this.sinon.stub(subject, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(subject, 'skip', function() {
        onOutcome('skip');
      });
      subject.retrieve();
    });
    test('dont launch when not enabled (no upgrade)', function(done) {
      MockasyncStorage.mItems['ftu.enabled'] = false;
      navigator.mozSettings
        .mSettings['deviceinfo.previous_os'] = '2.0.1.whatever';
      function onOutcome(name) {
        assert.equal(name, 'skip', 'subject.skip was called');
        assert.isFalse(subject.isFtuUpgrading());
        done();
      }
      this.sinon.stub(subject, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(subject, 'skip', function() {
        onOutcome('skip');
      });
      subject.retrieve();
    });
    test('launch when not enabled (upgrade)', function(done) {
      MockasyncStorage.mItems['ftu.enabled'] = false;
      navigator.mozSettings
        .mSettings['deviceinfo.previous_os'] = '1.4.1.whatever';
      function onOutcome(name) {
        assert.equal(name, 'launch', 'subject.launch was called');
        assert.isTrue(subject.isFtuUpgrading());
        done();
      }
      this.sinon.stub(subject, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(subject, 'skip', function() {
        onOutcome('skip');
      });
      subject.retrieve();
    });
    test('ftu ping is called', function() {
      var fakePromise = {
        then: sinon.stub()
      };

      this.sinon.stub(VersionHelper, 'getVersionInfo').returns(fakePromise);

      subject.retrieve();
      assert.ok(subject.getFtuPing().ensurePingCalled);
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
        assert.isTrue(subject.isFtuUpgrading());
        assert.equal(name, 'launch', 'subject.launch was called');
        assert.isTrue(subject.isFtuUpgrading());
        done();
      }
      this.sinon.stub(subject, 'launch', function() {
        onOutcome('launch');
      });
      this.sinon.stub(subject, 'skip', function() {
        onOutcome('skip');
      });
      subject.retrieve();
    });
  });

  suite('stepReady', function() {
    setup(function() {
      subject._stepsList = [];
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
