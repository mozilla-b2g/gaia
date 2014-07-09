'use strict';
/*global MockNavigatormozApps, MockNavigatorSettings, MocksHelper, MockL10n*/
/*global MockApplications*/

requireApp('system/shared/js/async_storage.js');
requireApp('system/shared/js/screen_layout.js');
requireApp('system/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_settings_url.js');

requireApp('system/js/accessibility.js');
requireApp('system/js/activities.js');
requireApp('system/js/activity_window_factory.js');
requireApp('system/js/activity_window_manager.js');
requireApp('system/js/airplane_mode.js');
requireApp('system/js/app_usage_metrics.js');
requireApp('system/js/app_window_factory.js');
requireApp('system/js/devtools/developer_hud.js');
requireApp('system/js/dialer_agent.js');
requireApp('system/js/ftu_launcher.js');
requireApp('system/js/rocketbar.js');
requireApp('system/js/home_gesture.js');
requireApp('system/js/home_searchbar.js');
requireApp('system/js/homescreen_launcher.js');
requireApp('system/js/internet_sharing.js');
requireApp('system/js/layout_manager.js');
requireApp('system/js/lockscreen_window_manager.js');
requireApp('system/js/media_recording.js');
requireApp('system/js/permission_manager.js');
requireApp('system/js/remote_debugger.js');
requireApp('system/js/secure_window_factory.js');
requireApp('system/js/secure_window_manager.js');
requireApp('system/js/sleep_menu.js');
requireApp('system/js/software_button_manager.js');
requireApp('system/js/source_view.js');
requireApp('system/js/storage.js');
requireApp('system/js/system_dialog_manager.js');
requireApp('system/js/telephony_settings.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/text_selection_dialog.js');
requireApp('system/js/ttlview.js');
requireApp('system/js/visibility_manager.js');
requireApp('system/js/wallpaper_manager.js');
requireApp('system/js/utility_tray_notifications.js');

requireApp('system/test/unit/mock_airplane_mode.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_places.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_task_manager.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_navigator_moz_chromenotifications.js');

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
  'AppWindowManager'
]).init();

suite('system/Bootstrap', function() {
  var realNavigatorSettings;
  var realNavigatormozL10n;
  var realNavigatormozApps;
  var realDocumentElementDir;
  var realDocumentElementLang;
  var realApplications;
  var fakeElement;

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
  });

  suiteSetup(function(done) {
    realNavigatormozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realDocumentElementDir = document.documentElement.dir;
    realDocumentElementLang = document.documentElement.lang;

    realNavigatormozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    realApplications = window.applications;
    window.applications = MockApplications;

    requireApp('system/js/bootstrap.js', done);
  });

  suiteTeardown(function() {
    navigator.mozApps = realNavigatormozApps;
    realNavigatormozApps = null;

    window.navigator.mozL10n = realNavigatormozL10n;
    realNavigatormozL10n = null;

    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;

    window.applications = realApplications;
    realApplications = null;
    document.documentElement.dir = realDocumentElementDir;
    document.documentElement.lang = realDocumentElementLang;
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
  
  suite('notifications component should send some events', function() {
    var setting = 'notifications.resend';
    var originalMozChromeNotifications =
          window.navigator.mozChromeNotifications;
    setup(function() {
      window.navigator.mozChromeNotifications = {
        'mozResendAllNotifications': function() {}
      };
      this.sinon.useFakeTimers();
      MockNavigatorSettings.mSettings[setting] = true;
      window.dispatchEvent(new CustomEvent('load'));
    });

    teardown(function() {
      window.navigator.mozChromeNotifications =
        originalMozChromeNotifications;
    });

    test('mozResendAllNotifications called' +
         ' and the desktop-notification-resend event has been sent',
    function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var expectedEvent =
        new CustomEvent('desktop-notification-resend');
      var stubMozResendAllNotifications = this.sinon.stub(
        window.navigator.mozChromeNotifications,
        'mozResendAllNotifications', function(cb) {
          cb();
          assert.isTrue(stubDispatchEvent.calledWithMatch(function(e) {
            return expectedEvent.type === e.type;
          }), 'it didn\'t send the event');
        });
      this.sinon.clock.tick();
      assert.ok(stubMozResendAllNotifications.calledOnce,
        'it didn\'t call to resend all notifications'
      );
      window.navigator.mozChromeNotifications =
        originalMozChromeNotifications;
    });
  });

  suite('or if settings is false it should not send', function() {
    var setting = 'notifications.resend';
    var originalMozChromeNotifications =
          window.navigator.mozChromeNotifications;
    setup(function() {
      window.navigator.mozChromeNotifications = {
        'mozResendAllNotifications': function() {}
      };
      this.sinon.useFakeTimers();
      MockNavigatorSettings.mSettings[setting] = false;
      window.dispatchEvent(new CustomEvent('load'));
    });

    teardown(function() {
      window.navigator.mozChromeNotifications =
        originalMozChromeNotifications;
    });

    test('mozResendAllNotifications was NOT called' +
         ' and the desktop-notification-resend event has been sent',
    function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var expectedEvent =
        new CustomEvent('desktop-notification-resend');
      var stubMozResendAllNotifications = this.sinon.stub(
        window.navigator.mozChromeNotifications,
        'mozResendAllNotifications', function(cb) {
          cb();
          assert.isFalse(stubDispatchEvent.calledWithMatch(function(e) {
            return expectedEvent.type === e.type;
          }), 'it did send the event');
        });
      this.sinon.clock.tick();
      assert.equal(stubMozResendAllNotifications.calledOnce, false,
        'it didn call to resend all notifications'
      );
      window.navigator.mozChromeNotifications =
        originalMozChromeNotifications;
    });
  });
});
