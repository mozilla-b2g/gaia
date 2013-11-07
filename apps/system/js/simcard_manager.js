'use strict';

var SimCardManager = {
  init: function() {
    this.simcardManagerWidget =
      document.getElementById('simcard-manager-widget');

    this.simcardManagerWidget.addEventListener('click',
      function onClick() {
        this.launchSettingsApp();
        UtilityTray.hide();
      }.bind(this));
  },
  launchSettingsApp: function() {
    // XXX: This should be replaced probably by Web Activities
    var host = document.location.host;
    var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
    var protocol = document.location.protocol + '//';
    var settingsApp = Applications.getByManifestURL(protocol + 'settings.' +
      domain + '/manifest.webapp').launch();
  }
};

SimCardManager.init();
