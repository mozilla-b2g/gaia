/* global FxAccountsIACHelper, FxaMenu */

'use strict';

require([
  'modules/settings_cache',
  'shared/lazy_loader'
], function(SettingsCache, LazyLoader) {
  navigator.mozL10n.once(function loadWhenIdle() {
    SettingsCache.getSettings(function(results) {
      var enabled = results['identity.fxaccounts.ui.enabled'];
      if (!enabled) {
        return;
      }
      var idleObserver = {
        time: 4,
        onidle: function() {
          navigator.removeIdleObserver(idleObserver);
          LazyLoader.load([
            '/shared/js/fxa_iac_client.js',
            '/shared/js/text_normalizer.js',
            'js/firefox_accounts/menu.js'
          ], function fxa_menu_loaded() {
            FxaMenu.init(FxAccountsIACHelper);
          });
        }
      };
      navigator.addIdleObserver(idleObserver);
    });
  });
});
