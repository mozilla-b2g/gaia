/* global ScreenLayout, Settings */

'use strict';

var Developer = {

  init: function about_init() {
    document.getElementById('ftuLauncher').onclick = this.launchFTU;

    // hide software home button whenever the device has no hardware home button
    if (!ScreenLayout.getCurrentLayout('hardwareHomeButton')) {
      document.getElementById('software-home-button').style.display = 'none';
      // always set homegesture enabled on tablet, so hide the setting
      if (!ScreenLayout.getCurrentLayout('tiny')) {
        document.getElementById('homegesture').style.display = 'none';
      }
    }
  },

  launchFTU: function about_launchFTU() {
    var settings = Settings.mozSettings;
    if (!settings) {
      return;
    }

    var key = 'ftu.manifestURL';
    var req = settings.createLock().get(key);
    req.onsuccess = function ftuManifest() {
      var ftuManifestURL = req.result[key];

      // fallback if no settings present
      if (!ftuManifestURL) {
        ftuManifestURL = document.location.protocol +
          '//communications.gaiamobile.org' +
          (location.port ? (':' + location.port) : '') +
          '/manifest.webapp';
      }

      var ftuApp = null;
      navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
        var apps = evt.target.result;
        for (var i = 0; i < apps.length && ftuApp == null; i++) {
          var app = apps[i];
          if (app.manifestURL == ftuManifestURL) {
            ftuApp = app;
          }
        }

        if (ftuApp) {
          ftuApp.launch('ftu');
        } else {
          alert(navigator.mozL10n.get('no-ftu'));
        }
      };
    };
  }
};

navigator.mozL10n.ready(Developer.init.bind(Developer));
