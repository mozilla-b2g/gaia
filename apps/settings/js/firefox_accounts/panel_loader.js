/* global FxaPanel, FxAccountsIACHelper, LazyLoader */

'use strict';

navigator.mozL10n.ready(function onL10nReady() {
  function onPanelReady(evt) {
    if (evt.detail.current !== '#fxa') {
      return;
    }
    window.removeEventListener('panelready', onPanelReady);
    LazyLoader.load([
      '/shared/js/fxa_iac_client.js',
      '/shared/js/text_normalizer.js',
      'js/firefox_accounts/panel.js'
    ], function fxa_panel_loaded() {
      FxaPanel.init(FxAccountsIACHelper);
    });
  }
  window.addEventListener('panelready', onPanelReady);
});
