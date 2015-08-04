'use strict';

requireApp('privacy-panel/js/vendor/alameda.js', () => {
  this.require = requirejs.config({
    baseUrl: '/js',
    paths: {
      shared: '../shared/js',
      mocks: '../shared/test/unit/mocks',
      mymocks: '/test/unit/mocks',
      html_helper: '../test/unit/html_helper'
    },
    shim: {
      'mocks/mock_navigator_moz_apps': {
        exports: 'MockNavigatormozApps'
      },
      'mocks/mock_navigator_moz_settings': {
        exports: 'MockNavigatorSettings'
      },
      'shared/settings_listener': {
        exports: 'SettingsListener'
      },
      'shared/settings_helper': {
        exports: 'SettingsHelper'
      },
      'mocks/mock_navigator_moz_set_message_handler': {
        exports: 'MockNavigatormozSetMessageHandler'
      },
      'shared/settings_url': {
        exports: 'SettingsURL'
      },
      'mocks/mock_l10n': {
        exports: 'MockL10n'
      },
      'mocks/mock_manifest_helper': {
        exports: 'MockManifestHelper'
      }
    },
    urlArgs: 'cache_bust=' + Date.now(),
    map: {
      '*': {
        'shared/async_storage': 'mymocks/mock_async_storage',
        'shared/manifest_helper': 'mocks/mock_manifest_helper',
        'sms/commands': 'mymocks/mock_commands'
      }
    }
  });
});
