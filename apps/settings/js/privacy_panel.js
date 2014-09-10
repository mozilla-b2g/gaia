/* global ScreenLayout, Settings */
'use strict';

var PrivacyPanel = {
  init: function about_init() {
    document.getElementById('menuItem-privacyPanel').onclick = this.launchPrivacyPanel;
},

launchPrivacyPanel: function about_launchPrivacyPanel() {
  var settings = Settings.mozSettings;
  if (!settings) {
    return;
  }

  var key = 'privacyPanel.manifestURL';
  var req = settings.createLock().get(key);

  req.onsuccess = function privacyPanelManifest() {

    var privacyPanelManifestURL = req.result[key];
    if (!privacyPanelManifestURL) {
      privacyPanelManifestURL = document.location.protocol +
        '//privacy-panel.gaiamobile.org' +
        (location.port ? (':' + location.port) : '') +
        '/manifest.webapp';
    }

    var privacyPanelApp = null;
    navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
      var apps = evt.target.result;
      for (var i = 0; i < apps.length && privacyPanelApp == null; i++) {
        var app = apps[i];
        if (app.manifestURL == privacyPanelManifestURL) {
          privacyPanelApp = app;
        }
      }

      if (privacyPanelApp) {
        privacyPanelApp.launch();
      } else {
        alert(navigator.mozL10n.get('no-settings'));
      }
    };
  };
}
};

navigator.mozL10n.once(PrivacyPanel.init.bind(PrivacyPanel));
