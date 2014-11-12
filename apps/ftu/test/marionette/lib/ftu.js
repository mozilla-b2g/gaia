'use strict';
/* global module */

var Marionette = require('marionette-client');

function Ftu(client) {
  this.client = client;
  this.actions = new Marionette.Actions(this.client);
}

Ftu.clientOptions = {
  prefs: {
    'focusmanager.testmode': true,
    'dom.w3c_touch_events.enabled': 1
  },
  settings: {
    'lockscreen.enabled': false
  }
};

/**
 * @type String Origin of Ftu app
 */
Ftu.URL = 'app://ftu.gaiamobile.org';

Ftu.Selectors = {
  'languagePanel': '#languages',
  'wifiPanel': '#wifi'
};

Ftu.prototype = {

  getPanel: function(panel) {
    return this.client.helper.waitForElement(
      Ftu.Selectors[panel + 'Panel']);
  },

  clickThruPanel: function(panel_id, button_id) {
    if (panel_id == '#wifi') {
      // The wifi panel will bring up a screen to show it is scanning for
      // networks. Not waiting for this to clear will blow test timing and cause
      // things to fail.
      this.client.helper.waitForElementToDisappear('#loading-overlay');
    }
    // waitForElement is used to make sure animations and page changes have
    // finished, and that the panel is displayed.
    this.client.helper.waitForElement(panel_id);
    if (button_id) {
      var button = this.client.helper.waitForElement(button_id);
      button.click();
    }
  }
};

module.exports = Ftu;
