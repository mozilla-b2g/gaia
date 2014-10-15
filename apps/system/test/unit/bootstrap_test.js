'use strict';
/*global MockNavigatormozApps, MockNavigatorSettings, MocksHelper, MockL10n,
         MockApplications, Applications, MockNavigatormozSetMessageHandler,
         MockGetDeviceStorages, MockVersionHelper, MockKeyboardManager,
         MockTrustedUIManager */

requireApp('system/shared/js/async_storage.js');
requireApp('system/shared/js/lazy_loader.js');
requireApp('system/shared/js/screen_layout.js');
requireApp('system/shared/js/nfc_utils.js');
requireApp('system/shared/js/version_helper.js');
requireApp('system/shared/js/settings_helper.js');
requireApp('system/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_getdevicestorage.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_getdevicestorages.js');

requireApp('system/js/accessibility.js');
requireApp('system/js/activities.js');
requireApp('system/js/activity_window_factory.js');
requireApp('system/js/activity_window_manager.js');
requireApp('system/js/airplane_mode.js');
requireApp('system/js/app_migrator.js');
requireApp('system/js/app_usage_metrics.js');
requireApp('system/js/app_window_factory.js');
requireApp('system/js/browser_settings.js');
requireApp('system/js/cpu_manager.js');
requireApp('system/js/devtools/developer_hud.js');
requireApp('system/js/dialer_agent.js');
requireApp('system/js/eu_roaming_manager.js');
requireApp('system/js/external_storage_monitor.js');
requireApp('system/js/ftu_launcher.js');
requireApp('system/js/rocketbar.js');
requireApp('system/js/home_gesture.js');
requireApp('system/js/homescreen_launcher.js');
requireApp('system/js/internet_sharing.js');
requireApp('system/js/layout_manager.js');
requireApp('system/js/lockscreen_window_manager.js');
requireApp('system/js/lockscreen_notifications.js');
requireApp('system/js/lockscreen_passcode_validator.js');
requireApp('system/js/lockscreen_notification_builder.js');
requireApp('system/js/media_recording.js');
requireApp('system/js/permission_manager.js');
requireApp('system/js/remote_debugger.js');
requireApp('system/js/secure_window_factory.js');
requireApp('system/js/secure_window_manager.js');
requireApp('system/js/sleep_menu.js');
requireApp('system/js/orientation_manager.js');
requireApp('system/js/nfc_manager.js');
requireApp('system/js/shrinking_ui.js');
requireApp('system/js/software_button_manager.js');
requireApp('system/js/source_view.js');
requireApp('system/js/usb_storage.js');
requireApp('system/js/system_dialog_manager.js');
requireApp('system/js/telephony_settings.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/text_selection_dialog.js');
requireApp('system/js/ttlview.js');
requireApp('system/js/visibility_manager.js');
requireApp('system/js/wallpaper_manager.js');
requireApp('system/js/attention_window_manager.js');
requireApp('system/js/attention_indicator.js');

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_attention_window.js');
requireApp('system/test/unit/mock_callscreen_window.js');
requireApp('system/test/unit/mock_airplane_mode.js');
requireApp('system/test/unit/mock_applications.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_places.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_task_manager.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_homescreen_window_manager.js');
requireApp('system/test/unit/mock_version_helper.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');

var mocksForBootstrap = new MocksHelper([
  'AirplaneMode',
  'Applications',
  'IccHelper',
  'ScreenManager',
  'Places',
  'SettingsListener',
  'SettingsURL',
  'TaskManager',
  'L10n',
  'HomescreenWindowManager',
  'AppWindowManager',
  'VersionHelper',
  'CallscreenWindow'
]).init();

suite('system/Bootstrap', function() {
  var realNavigatorSettings;
  var realNavigatormozL10n;
  var realNavigatormozApps;
  var realNavigatormozSetMeesageHandler;
  var realNavigatorGetDeviceStorages;
  var realDocumentElementDir;
  var realDocumentElementLang;
  var realApplications;
  var realVersionHelper;
  var fakeElement;
  var realKeyboardManager;
  var realTrustedUIManager;

  mocksForBootstrap.attachTestHelpers();

  setup(function() {
    fakeElement = document.createElement('div');
    this.sinon.stub(document, 'getElementById')
      .returns(fakeElement.cloneNode(true));
    this.sinon.stub(document, 'querySelector')
      .returns(fakeElement.cloneNode(true));
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    MockNavigatormozApps.mTeardown();
    MockApplications.mTeardown();
    MockNavigatormozSetMessageHandler.mTeardown();
  });

  suiteSetup(function(done) {
    realNavigatormozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realNavigatormozSetMeesageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();

    realDocumentElementDir = document.documentElement.dir;
    realDocumentElementLang = document.documentElement.lang;

    realNavigatormozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    realApplications = window.applications;
    window.applications = MockApplications;

    realNavigatorGetDeviceStorages = navigator.getDeviceStorages;
    navigator.getDeviceStorages = MockGetDeviceStorages;

    realVersionHelper = window.VersionHelper;
    window.VersionHelper = MockVersionHelper(false);

    realKeyboardManager = window.KeyboardManager;
    window.KeyboardManager = MockKeyboardManager;

    realTrustedUIManager = window.TrustedUIManager;
    window.TrustedUIManager = MockTrustedUIManager;

    requireApp('system/js/bootstrap.js', done);
  });

  suiteTeardown(function() {
    navigator.mozApps = realNavigatormozApps;
    realNavigatormozApps = null;

    window.navigator.mozL10n = realNavigatormozL10n;
    realNavigatormozL10n = null;

    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;

    navigator.mozSetMessageHandler = realNavigatormozSetMeesageHandler;
    realNavigatormozSetMeesageHandler = null;

    window.applications = realApplications;
    realApplications = null;

    navigator.getDeviceStorages = realNavigatorGetDeviceStorages;
    realNavigatorGetDeviceStorages = null;

    window.KeyboardManager = realKeyboardManager;
    window.TrustedUIManager = realTrustedUIManager;

    document.documentElement.dir = realDocumentElementDir;
    document.documentElement.lang = realDocumentElementLang;
  });

  suite('check for updates setting', function() {
    var setting = 'gaia.system.checkForUpdates';
    suite('after First Time User setup has been done', function() {
      setup(function() {
        // mock
        window.SettingsMigrator = function() {
          this.start = function() {};
        };
        // this.sinon.stub(SettingsMigrator, 'start');
        MockNavigatorSettings.mSettings[setting] = false;
        window.dispatchEvent(new CustomEvent('load'));
        window.dispatchEvent(new CustomEvent('ftudone'));
      });

      teardown(function() {
        window.SettingsMigrator = null;
      });

      test('should be enabled', function() {
        assert.isTrue(MockNavigatorSettings.mSettings[setting]);
      });
    });

    suite('at boot, if NOFTU is defined (i.e in DEBUG mode)', function() {
      setup(function() {
        // mock
        window.SettingsMigrator = function() {
          this.start = function() {};
        };
        Applications.ready = true;
        MockNavigatorSettings.mSettings[setting] = false;
        window.dispatchEvent(new CustomEvent('load'));
        window.dispatchEvent(new CustomEvent('ftuskip'));
      });

      teardown(function() {
        window.SettingsMigrator = null;
      });

      test('should be enabled', function() {
        assert.isTrue(MockNavigatorSettings.mSettings[setting]);
      });
    });
  });

  suite('check for insane devices beeing cancelled', function() {
    function createEvent(type) {
      var evt = new CustomEvent(type, { bubbles: true, cancelable: true });
      evt.pageX = evt.pageY = 0;
      evt.touches = [{ pageX: 0, pageY: 0 }];
      evt.changedTouches = [{ pageX: 0, pageY: 0 }];
      return evt;
    }

    test('mousedown should be preventDefaulted', function() {
      assert.ok(window.dispatchEvent(createEvent('mousedown')) === false);
    });

    test('mouseup should be preventDefaulted', function() {
      assert.ok(window.dispatchEvent(createEvent('mouseup')) === false);
    });

    test('touchend should be preventDefaulted', function() {
      assert.ok(window.dispatchEvent(createEvent('touchstart')) === false);
    });

    test('touchend should be preventDefaulted', function() {
      assert.ok(window.dispatchEvent(createEvent('touchend')) === false);
    });
  });
});
