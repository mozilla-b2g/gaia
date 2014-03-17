/* global FxAccountsIACHelper, FxaMenu, LazyLoader, Settings */

'use strict';

navigator.mozL10n.ready(function loadWhenIdle() {
  Settings.getSettings(function(results) {
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
