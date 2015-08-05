'use strict';

define('fxsync', ['modules/settings_utils', 'shared/settings_listener'
], function(SettingsUtils, SettingsListener) {
  var FxSync = {
    init: function fmd_init() {
      // The app name may overflow the header width in some locales; try to
      // shrink it. Bug 1087441
      var header = document.querySelector('#fxsync gaia-header');
      SettingsUtils.runHeaderFontFit(header);
    },
  };

  return FxSync;
});

navigator.mozL10n.once(function() {
  require(['fxsync'], function(FxSync) {
    FxSync.init();
  });
});
