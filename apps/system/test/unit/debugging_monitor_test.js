/* global MocksHelper, BaseModule, MockNavigatorSettings,
          MockLazyLoader */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/debugging_icon.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/debugging_monitor.js');

var mocksForDebuggingMonitor = new MocksHelper([
  'NavigatorSettings',
  'LazyLoader'
]).init();

suite('system/DebuggingMonitor', function() {
  var subject, settingsCore, realMozSettings;
  mocksForDebuggingMonitor.attachTestHelpers();

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    MockLazyLoader.mLoadRightAway = true;
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    subject = BaseModule.instantiate('DebuggingMonitor');
    this.sinon.spy(MockLazyLoader, 'load');
    subject.start();
  });

  teardown(function() {
    settingsCore.stop();
    subject.stop();
  });

  test('Should lazy load debugging icon', function() {
    assert.isTrue(MockLazyLoader.load.calledWith(['js/debugging_icon.js']));
  });

  suite('Update icon', function() {
    setup(function() {
      this.sinon.stub(subject.icon, 'update');
    });
    test('Should be enabled if setting value is adb-devtools', function() {
      MockNavigatorSettings.mTriggerObservers('debugger.remote-mode',
        { settingValue: 'adb-devtools' });
      assert.isTrue(subject.enabled);
      assert.isTrue(subject.icon.update.called);
    });

    test('Should be enabled if setting value is adb-only', function() {
      MockNavigatorSettings.mTriggerObservers('debugger.remote-mode',
        { settingValue: 'adb-only' });
      assert.isTrue(subject.enabled);
      assert.isTrue(subject.icon.update.called);
    });

    test('Should be disabled if setting value is adb-only', function() {
      MockNavigatorSettings.mTriggerObservers('debugger.remote-mode',
        { settingValue: 'disabled' });
      assert.isFalse(subject.enabled);
      assert.isTrue(subject.icon.update.called);
    });
  });
});