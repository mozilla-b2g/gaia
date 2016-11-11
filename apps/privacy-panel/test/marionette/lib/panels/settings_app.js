'use strict';

var Base = require('../base');

function PrivacyPanelApp(client) {
  Base.call(this, client, 'app://settings.gaiamobile.org');
}

module.exports = PrivacyPanelApp;

PrivacyPanelApp.prototype = {

  __proto__: Base.prototype,

  selectors: {
    ppMenuItem: '.privacy-panel-item',
    backToSettings: '#back-to-settings'
  },

  init: function() {
    this.launch();
  },

  tapOnMenuItem: function() {
    this.client.findElement(this.selectors.ppMenuItem).tap();
  },

  tapOnBackToSettingsBtn: function() {
    this.client.findElement(this.selectors.backToSettings).tap();
  }

};
