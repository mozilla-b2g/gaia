/* global MocksHelper, BaseModule, MockNavigatorSettings,
          MockLazyLoader, MockNavigatorMozMobileConnections */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/data_connection_manager.js');

var mocksForDataConnectionManager = new MocksHelper([
  'NavigatorSettings',
  'LazyLoader'
]).init();

suite('system/DataConnectionManager', function() {
  var subject, settingsCore;
  var realMozSettings;
  mocksForDataConnectionManager.attachTestHelpers();

  suiteSetup(function() {
    window.RoamingWarningSystemDialog = function() {};
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  suiteTeardown(function() {
    window.RoamingWarningSystemDialog = null;
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    subject = BaseModule.instantiate('DataConnectionManager',
      {
        mobileConnections: MockNavigatorMozMobileConnections
      });
    subject.start();
    this.sinon.stub(MockLazyLoader, 'load').returns(Promise.resolve());
  });

  teardown(function() {
    settingsCore.stop();
    subject.stop();
  });

  suite('enableDataConnection', function() {
    test('Roaming', function() {
      MockNavigatorMozMobileConnections[0].data = {
        type: '3g',
        roaming: true
      };
      MockNavigatorSettings.mTriggerObservers('ril.data.roaming_enabled',
        { settingValue: false });
      subject.enableDataConnection();
      assert.isTrue(MockLazyLoader.load.calledWith(
        ['js/roaming_warning_system_dialog.js']));
    });

    test('Roaming but roaming is enabled', function() {
      MockNavigatorMozMobileConnections[0].data = {
        type: '3g',
        roaming: true
      };
      MockNavigatorSettings.mTriggerObservers('ril.data.roaming_enabled',
        { settingValue: true });
      subject.enableDataConnection();
      assert.isFalse(MockLazyLoader.load.calledWith(
        ['js/roaming_warning_system_dialog.js']));
    });

    test('Not roaming', function() {
      MockNavigatorMozMobileConnections[0].data = {
        type: '3g',
        roaming: false
      };
      this.sinon.spy(subject, 'writeSetting');
      subject.enableDataConnection();
      assert.isTrue(subject.writeSetting.calledWith(
        {'ril.data.enabled': true}));
    });
  });
});