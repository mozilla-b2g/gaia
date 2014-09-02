'use strict';

var Base = require('./base');

/**
 * Abstraction around bluetooth app
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function BluetoothApp(client) {
  Base.call(this, client, null, BluetoothApp.Selectors);
}

module.exports = BluetoothApp;

BluetoothApp.Selectors = {
  'settingsHeader' : '#header'
};

BluetoothApp.SETTINGS_LAUNCH_PATH = 'app://bluetooth.gaiamobile.org/' +
                                    'settings.html';

BluetoothApp.prototype = {
  __proto__: Base.prototype,

  switchToSettings: function() {
    var settingsFrame = this.client.findElement(
      'iframe[src*="' + BluetoothApp.SETTINGS_LAUNCH_PATH + '"]');

    // Wait for the iframe is displayed on screen.
    this.client.waitFor(function(done) {
      settingsFrame.displayed(done);
     });

    this.client.switchToFrame(settingsFrame);
  },

  goBackToSettingsApp: function() {
    var header = this.waitForElement('settingsHeader');
    var evt = new Event('action', {
      cancelable: true,
      bubbles: true
    });
    header.dispatchEvent(evt);
  },

  get header() {
    return this.waitForElement('settingsHeader');
  }
};
