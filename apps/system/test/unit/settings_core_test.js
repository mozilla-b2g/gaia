/* global MocksHelper, MockNavigatorSettings, BaseModule */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

var mocksForSettingsCore = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/SettingsCore', function() {
  var realSettings;
  mocksForSettingsCore.attachTestHelpers();

  setup(function(done) {
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
    this.sinon.useFakeTimers();
    requireApp('system/js/service.js');
    requireApp('system/js/base_module.js');
    requireApp('system/js/settings_core.js', done);
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    window.navigator.mozSettings = realSettings;
  });

  suite('SettingsCore API', function() {
    var subject;
    setup(function() {
      subject = BaseModule.instantiate('SettingsCore');
      subject.start();
    });

    teardown(function() {
      subject.stop();
    });

    test('read', function(done) {
      MockNavigatorSettings.mSyncRepliesOnly = true;
      subject.get('lockscreen.locked').then(function(result) {
        assert.isTrue(result);
        done();
      });
      MockNavigatorSettings.mRequests[0].result['lockscreen.locked'] = true;
      MockNavigatorSettings.mReplyToRequests();
    });

    test('write', function(done) {
      MockNavigatorSettings.mSyncRepliesOnly = true;
      subject.set({'lockscreen.locked' : false}).then(function() {
        assert.equal(MockNavigatorSettings.mSettings['lockscreen.locked'],
          false);
        done();
      });
      MockNavigatorSettings.mReplyToRequests();
    });

    test('addObserver', function() {
      var spy = this.sinon.spy();
      var observer = {
        name: 'fakeObserver',
        observe: spy
      };
      subject.addObserver('lockscreen.enabled', observer);

      MockNavigatorSettings.mTriggerObservers('lockscreen.enabled',
        {
          settingValue: true
        });

      assert.isTrue(spy.calledWith('lockscreen.enabled', true));

      MockNavigatorSettings.mTriggerObservers('lockscreen.enabled',
        {
          settingValue: false
        });

      assert.isTrue(spy.calledWith('lockscreen.enabled', false));
    });

    test('removeObserver', function() {
      var spy = this.sinon.spy();
      var observer = {
        name: 'fakeObserver',
        observe: spy
      };
      subject.addObserver('lockscreen.enabled', observer);
      subject.removeObserver('lockscreen.enabled', observer);

      MockNavigatorSettings.mTriggerObservers('lockscreen.enabled',
        {
          settingValue: true
        });

      assert.isFalse(spy.called);
    });
  });
});
