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
  'settingsHeader': '#general-header',
  'vibrationCheckbox': '#cb-vibration'
};

KeyboardApp.SETTINGS_LAUNCH_PATH = 'app://keyboard.gaiamobile.org/' +
                                   'settings.html';

KeyboardApp.prototype = {
  __proto__: Base.prototype,

  get vibrationFromMozSettings() {
    return this.client.settings.get('keyboard.vibration');
  },

  switchToSettings: function() {
    this.client.switchToFrame();
    var settingsFrame = this.client.findElement(
      'iframe[src*="' + KeyboardApp.SETTINGS_LAUNCH_PATH + '"]');

    /**
     * XXX: Workaround to wait for the frame is ready after switching to the
     * keyboard app's settings page. We should use
     * this.client.apps.switchToApp(KeyboardApp.SETTINGS_LAUNCH_PATH)
     * instead of the logic below after Bug 1027994 is fixed.
     *
     * Add swithToApp waiting logic here, see Bug 1003788 for a similar
     * technique we implemented in marionette-apps plugin.
     */

    // Wait for the iframe is rendered.
    this.client.waitFor(function() {
      var frameClass = settingsFrame.scriptWith(function(el) {
        return el.parentNode.getAttribute('class');
      });

      if (frameClass !== null) {
        return frameClass.indexOf('render') !== -1;
      } else {
        return true;
      }
    });

    // Wait for the iframe is displayed on screen.
    this.client.waitFor(function() {
      var transitionState = settingsFrame.scriptWith(function(el) {
        return el.parentNode.getAttribute('transition-state');
      });

      if (transitionState !== null) {
        return transitionState === 'opened';
      } else {
        return settingsFrame.displayed();
      }
    });

    this.client.switchToFrame(settingsFrame);
  },

  clickVibrationOption: function() {
    this.waitForElement('vibrationCheckbox').click();
  },

  goBackToSettingsApp: function() {
    var header = this.waitForElement('settingsHeader');
    header.tap(25, 25);
  }
};
