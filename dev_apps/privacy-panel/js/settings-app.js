/* global ScreenLayout, Settings */
'use strict';

var SettingApp = {
  init: function about_init() {
    document.getElementById('back').onclick = this.launchSettings;
},

launchSettings: function about_launchSettings() {
  var settingsManifestURL = document.location.protocol +
        '//settings.gaiamobile.org' +
        (location.port ? (':' + location.port) : '') +
        '/manifest.webapp';

  var settingsApp = null;
  navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
    var apps = evt.target.result;
    for (var i = 0; i < apps.length && settingsApp == null; i++) {
      var app = apps[i];
      if (app.manifestURL == settingsManifestURL) {
        settingsApp = app;
      }
    }

    if (settingsApp) {
      settingsApp.launch();
    } else {
      alert(navigator.mozL10n.get('no-settings'));
    }
  };
}
};

navigator.mozL10n.once(SettingApp.init.bind(SettingApp));
