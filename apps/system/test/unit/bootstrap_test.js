/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global MockNavigatormozApps, MockNavigatorSettings, MocksHelper, MockL10n*/
/*global MockHomescreenLauncher, Applications*/

'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_settings_url.js');
requireApp('system/test/unit/mock_activities.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_devtools_view.js');
requireApp('system/test/unit/mock_dialer_comms.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_media_recording.js');
requireApp('system/test/unit/mock_places.js');
requireApp('system/test/unit/mock_remote_debugger.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_source_view.js');
requireApp('system/test/unit/mock_storage.js');
requireApp('system/test/unit/mock_ttl_view.js');
requireApp('system/test/unit/mock_title.js');
requireApp('system/test/unit/mock_secure_window_manager.js');
requireApp('system/test/unit/mock_secure_window_factory.js');
requireApp('system/test/unit/mock_activity_window_factory.js');

mocha.globals([
  'Shortcuts',
  'wallpaperURL',
  'activities',
  'cancelHomeTouchstart',
  'cancelHomeTouchend',
  'mediaRecording',
  'secureWindowManager',
  'secureWindowFactory',
  'devtoolsView',
  'dialerComms',
  'remoteDebugger',
  'storage',
  'ttlView',
  'title',
  'activityWindowFactory',
  'ActivityWindowFactory',
  'homescreenLauncher',
  'HomescreenLauncher'
]);

var mocksForBootstrap = new MocksHelper([
  'Activities',
  'Applications',
  'DevtoolsView',
  'DialerComms',
  'FtuLauncher',
  'HomescreenLauncher',
  'MediaRecording',
  'Places',
  'RemoteDebugger',
  'ScreenManager',
  'SettingsListener',
  'SettingsURL',
  'SourceView',
  'Storage',
  'TTLView',
  'Title',
  'SecureWindowManager',
  'SecureWindowFactory',
  'ActivityWindowFactory'
]).init();

suite('system/Bootstrap', function() {
  var realNavigatorSettings;
  var realNavigatormozApps;
  var realNavigatormozL10n;
  var realDocumentElementDir;
  var realDocumentElementLang;

  mocksForBootstrap.attachTestHelpers();

  suiteSetup(function(done) {
    realNavigatormozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realDocumentElementDir = document.documentElement.dir;
    realDocumentElementLang = document.documentElement.lang;

    realNavigatormozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    window.HomescreenLauncher = MockHomescreenLauncher;
    requireApp('system/js/bootstrap.js', done);
  });

  suiteTeardown(function() {
    navigator.mozApps = realNavigatormozApps;
    realNavigatormozApps = null;

    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;

    navigator.mozL10n = realNavigatormozL10n;
    realNavigatormozL10n = null;

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
});
