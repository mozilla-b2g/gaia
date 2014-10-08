define(function(){
  'use strict';

  function PrivacyPanelHandler() {}

  PrivacyPanelHandler.prototype = {

    /**
     * Initialize click event for Privacy Panel menu item.
     */
    init: function() {
      document.getElementById('menuItem-privacyPanel')
        .addEventListener('click', this.launch);
    },

    /**
     * Launch Privacy Panel app.
     */
    launch: function(event) {
      event.stopImmediatePropagation();
      event.preventDefault();

      var privacyPanelManifestURL = document.location.protocol +
        '//privacy-panel.gaiamobile.org' +
        (location.port ? (':' + location.port) : '') + '/manifest.webapp';

      var privacyPanelApp = null;
      navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
        var apps = evt.target.result;
        for (var i = 0; i < apps.length && privacyPanelApp === null; i++) {
          var app = apps[i];
          if (app.manifestURL === privacyPanelManifestURL) {
            privacyPanelApp = app;
          }
        }

        if (privacyPanelApp) {
          // Let privacy-panel app know that we launched it from settings
          // so the app can show us a back button pointing to settings app.
          navigator.mozSettings.createLock().set({
            'pp.launched.by.settings': true
          });

          privacyPanelApp.launch();
        } else {
          alert(navigator.mozL10n.get('no-privacypanel'));
        }
      };
    }
  };

  return new PrivacyPanelHandler();
});