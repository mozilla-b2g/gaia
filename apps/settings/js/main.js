require(['config/require'], function() {
  'use strict';

  define('boot', function(require) {
    var SettingsService = require('modules/settings_service'),
        SettingsCache = require('modules/settings_cache'),
        PageTransitions = require('modules/page_transitions'),
        LazyLoader = require('shared/lazy_loader'),
        ScreenLayout = require('shared/screen_layout'),
        Settings = require('settings');

    /**
     * In two column layout, the root panel should not be deactivated. We pass
     * the id of the root panel to SettingsService so that it won't deacivate
     * the root panel when in two column.
     * XXX: Currently we don't separate the navigation logic of one column and
     *      two column layout, so that the root panel will not be deactivated
     *      in in one column layout.
     */
    SettingsService.init('root');

    var options = {
      SettingsService: SettingsService,
      SettingsCache: SettingsCache,
      PageTransitions: PageTransitions,
      LazyLoader: LazyLoader,
      ScreenLayout: ScreenLayout
    };

    if (document && (document.readyState === 'complete' ||
        document.readyState === 'interactive')) {
      Settings.init(options);
    } else {
      window.addEventListener('load', function onload() {
        window.removeEventListener('load', onload);
        Settings.init(options);
      });
    }
  });

  require(['boot']);
});
