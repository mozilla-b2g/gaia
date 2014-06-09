'use strict';

var Base = require('./base');

/**
 * Abstraction around keyboard app
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function KeyboardApp(client) {
  Base.call(this, client, null, KeyboardApp.Selectors);
}

module.exports = KeyboardApp;

KeyboardApp.Selectors = {
  'settingsBackButton': '#back'
};

KeyboardApp.SETTINGS_LAUNCH_PATH = 'app://keyboard.gaiamobile.org/' +
                                   'settings.html';

KeyboardApp.prototype = {
  __proto__: Base.prototype,

  switchToSettings: function() {
    this.client.switchToFrame();
    var settingsFrame = this.client.findElement(
      'iframe[src*="' + KeyboardApp.SETTINGS_LAUNCH_PATH + '"]');
    this.client.switchToFrame(settingsFrame);
  },

  goBackToSettingsApp: function() {
    var backButton = this.waitForElement('settingsBackButton');
    backButton.click();
  }
};
