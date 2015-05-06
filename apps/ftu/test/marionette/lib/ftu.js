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
    'ftu.manifestURL': 'app://ftu.gaiamobile.org/manifest.webapp'
  }
};

/**
 * @type String Origin of Ftu app
 */
Ftu.URL = 'app://ftu.gaiamobile.org';

Ftu.Selectors = {
  'languagePanel': '#languages',
  'wifiPanel': '#wifi',
  'header': '#activation-screen gaia-header h1',
  'languageItems': '#languages ul > li[data-value]'
};

Ftu.prototype = {
  waitForL10nReady: function() {
    this.client.helper.waitFor(function() {
      return this.client.executeScript(function() {
        return window.wrappedJSObject.navigator.mozL10n
               .readyState === 'complete';
      });
    }.bind(this));
  },

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
  },
  waitForLanguagesToLoad: function() {
    return this.client.waitFor(function() {
      return this.client.findElements(Ftu.Selectors.languageItems).length > 1;
    }.bind(this));
  },
  selectLanguage: function(language) {
    this.waitForL10nReady();
    this.waitForLanguagesToLoad();
    this.client.helper.waitForElement('#languages');
    var item = this.client.findElement(
                '#languages li[data-value="' + language + '"]');
    if (item) {
      // scroll to it..
      item.scriptWith(function(el){
        el.scrollIntoView(false);
      });
      item.tap();
    } else {
      throw new Error('Option '+ language +
                      ' could not be found in select wrapper');
    }
  }
};

module.exports = Ftu;
