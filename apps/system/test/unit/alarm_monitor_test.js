/* global MocksHelper, BaseModule, MockNavigatorSettings,
          MockLazyLoader */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/alarm_icon.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/alarm_monitor.js');

var mocksForAlarmMonitor = new MocksHelper([
  'NavigatorSettings',
  'LazyLoader'
]).init();

suite('system/AlarmMonitor', function() {
  var subject, settingsCore, realMozSettings;
  mocksForAlarmMonitor.attachTestHelpers();

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    subject = BaseModule.instantiate('AlarmMonitor');
    this.sinon.spy(MockLazyLoader, 'load');
    subject.start();
  });

  teardown(function() {
    settingsCore.stop();
    subject.stop();
  });

  test('Should lazy load icon', function() {
    assert.isTrue(MockLazyLoader.load.calledWith(['js/alarm_icon.js']));
  });

  suite('Update icon', function() {
    setup(function() {
      this.sinon.stub(subject.icon, 'update');
    });

    test('Should be enabled if setting value is true', function() {
      MockNavigatorSettings.mTriggerObservers('alarm.enabled',
        { settingValue: true });
      assert.isTrue(subject.enabled);
      assert.isTrue(subject.icon.update.called);
    });

    test('Should be enabled if setting value is false', function() {
      MockNavigatorSettings.mTriggerObservers('alarm.enabled',
        { settingValue: false });
      assert.isFalse(subject.enabled);
      assert.isTrue(subject.icon.update.called);
    });
  });
});