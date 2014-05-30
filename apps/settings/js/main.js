require(['config/require'], function() {
  'use strict';

  define('boot', function(require) {
    // The following are the scripts used by many other scripts. We load them
    // at once here. These should be move to the dependency of each panel in the
    // future.
    require('utils');
    require('shared/async_storage');
    require('shared/settings_listener');
    // used by connectivity.js, wifi.js, wifi_select_certificate_file.js
    require('shared/wifi_helper');
    // used by security_privacy.js, messaging.js
    require('shared/icc_helper');

    var SettingsService = require('modules/settings_service');
    var PageTransitions = require('modules/page_transitions');
    var LazyLoader = require('shared/lazy_loader');
    var ScreenLayout = require('shared/screen_layout');
    var Settings = require('settings');
    var Connectivity = require('connectivity');

    /**
     * In two column layout, the root panel should not be deactivated. We pass
     * the id of the root panel to SettingsService so that it won't deacivate
     * the root panel when in two column.
     * XXX: Currently we don't separate the navigation logic of one column and
     *      two column layout, so that the root panel will not be deactivated
     *      in one column layout.
     */
    SettingsService.init('root');

    var options = {
      SettingsService: SettingsService,
      PageTransitions: PageTransitions,
      LazyLoader: LazyLoader,
      ScreenLayout: ScreenLayout,
      Connectivity: Connectivity
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
