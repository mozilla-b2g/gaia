/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global MockNavigatormozApps, MockNavigatorSettings, MocksHelper, MockL10n*/
/*global MockApplications, Applications*/

'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_settings_url.js');

requireApp('system/js/accessibility.js');
requireApp('system/js/activities.js');
requireApp('system/js/activity_window_factory.js');
requireApp('system/js/activity_window_manager.js');
requireApp('system/js/app_window_factory.js');
requireApp('system/js/devtools_view.js');
requireApp('system/js/dialer_agent.js');
requireApp('system/js/rocketbar.js');
requireApp('system/js/home_searchbar.js');
requireApp('system/js/homescreen_launcher.js');
requireApp('system/js/layout_manager.js');
requireApp('system/js/lockscreen_window_manager.js');
requireApp('system/js/media_recording.js');
requireApp('system/js/remote_debugger.js');
requireApp('system/js/secure_window_factory.js');
requireApp('system/js/secure_window_manager.js');
requireApp('system/js/visibility_manager.js');
requireApp('system/js/source_view.js');
requireApp('system/js/storage.js');
requireApp('system/js/system_dialog_manager.js');
requireApp('system/js/telephony_settings.js');
requireApp('system/js/ttlview.js');

requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/test/unit/mock_home_gesture.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_permission_manager.js');
requireApp('system/test/unit/mock_places.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_software_button_manager.js');

mocha.globals([
  'accessibility',
  'activityWindowManager',
  'activities',
  'applications',
  'appWindowFactory',
  'cancelHomeTouchstart',
  'cancelHomeTouchend',
  'cancelHomeClick',
  'devtoolsView',
  'dialerAgent',
  'homeGesture',
  'homeSearchbar',
  'homescreenLauncher',
  'layoutManager',
  'lockScreenWindowManager',
  'mediaRecording',
  'permissionManager',
  'places',
  'remoteDebugger',
  'rocketbar',
  'secureWindowFactory',
  'secureWindowManager',
  'Shortcuts',
  'sourceView',
  'softwareButtonManager',
  'storage',
  'systemDialogManager',
  'telephonySettings',
  'ttlView',
  'visibilityManager',
  'wallpaperURL'
]);

var mocksForBootstrap = new MocksHelper([
  'Applications',
  'FtuLauncher',
  'HomeGesture',
  'ScreenManager',
  'PermissionManager',
  'Places',
  'SettingsListener',
  'SettingsURL',
  'SoftwareButtonManager',
  'L10n'
]).init();

suite('system/Bootstrap', function() {
  var realNavigatorSettings;
  var realNavigatormozL10n;
  var realNavigatormozApps;
  var realDocumentElementDir;
  var realDocumentElementLang;
  var realApplications;

  mocksForBootstrap.attachTestHelpers();

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

  suite('check for updates setting', function() {
    var setting = 'gaia.system.checkForUpdates';
    suite('after First Time User setup has been done', function() {
      setup(function() {
        MockNavigatorSettings.mSettings[setting] = false;
        window.dispatchEvent(new CustomEvent('load'));
        window.dispatchEvent(new CustomEvent('ftudone'));
      });

      test('should be enabled', function() {
        assert.isTrue(MockNavigatorSettings.mSettings[setting]);
      });
    });

    suite('at boot, if NOFTU is defined (i.e in DEBUG mode)', function() {
      setup(function() {
        Applications.ready = true;
        MockNavigatorSettings.mSettings[setting] = false;
        window.dispatchEvent(new CustomEvent('load'));
        window.dispatchEvent(new CustomEvent('ftuskip'));
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
