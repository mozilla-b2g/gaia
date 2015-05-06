/* global MocksHelper, BaseModule, MockNavigatorSettings,
          MockLazyLoader */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/tethering_icon.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/tethering_monitor.js');

var mocksForTetheringMonitor = new MocksHelper([
  'NavigatorSettings',
  'LazyLoader'
]).init();

suite('system/TetheringMonitor', function() {
  var subject, settingsCore, realMozSettings;
  mocksForTetheringMonitor.attachTestHelpers();

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
    subject = BaseModule.instantiate('TetheringMonitor');
    this.sinon.spy(MockLazyLoader, 'load');
    subject.start();
  });

  teardown(function() {
    settingsCore.stop();
    subject.stop();
  });

  test('Should lazy load tethering icon', function() {
    assert.isTrue(MockLazyLoader.load.calledWith(['js/tethering_icon.js']));
  });

  suite('Update icon', function() {
    setup(function() {
      this.sinon.stub(subject.icon, 'update');
    });
    test('Should be enabled once usb tethering is ongoing', function() {
      MockNavigatorSettings.mTriggerObservers('tethering.usb.enabled',
        { settingValue: true });
      assert.isTrue(subject.enabled);
      assert.isTrue(subject.icon.update.called);
    });

    test('Should be enabled once wifi tethering is ongoing', function() {
      MockNavigatorSettings.mTriggerObservers('tethering.wifi.enabled',
        { settingValue: true });
      assert.isTrue(subject.enabled);
      assert.isTrue(subject.icon.update.called);
    });

    test('Should be connected if there is any client on usb', function() {
      MockNavigatorSettings.mTriggerObservers('tethering.usb.connectedClients',
        { settingValue: 1 });
      assert.isTrue(subject.connected);
      assert.isTrue(subject.icon.update.called);
    });

    test('Should be enabled if there is any client on wifi', function() {
      MockNavigatorSettings.mTriggerObservers('tethering.wifi.connectedClients',
        { settingValue: 2 });
      assert.isTrue(subject.connected);
      assert.isTrue(subject.icon.update.called);
    });
  });
});