'use strict';
/* global module */

var Marionette = require('marionette-client');

function Ftu(client) {
  this.client = client;
  this.actions = new Marionette.Actions(this.client);
}

Ftu.clientOptions = {
  prefs: {
    'focusmanager.testmode': true
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
  'languageItems': '#languages ul > li[data-value]',
  'finishScreen': '#finish-screen',

  // Tutorial Section
  'startTourButton': '#lets-go-button',
  'completeTourButton': '#tutorialFinished',
  'tourPanel': '#tutorial',
  'nextButton': '#forward',
  'tourNextButton': '#forward-tutorial',
  'tourFinishedPanels': '.tutorial-finish-base'
};

Ftu.prototype = {
  get startTourButton() {
    return this.client.findElement(Ftu.Selectors.startTourButton);
  },
  get completeTourButton() {
    return this.client.findElement(Ftu.Selectors.completeTourButton);
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

  clickThruToFinish: function() {
    this.client.helper.waitForElement('#languages');
    var finishScreen = this.client.findElement(Ftu.Selectors.finishScreen);
    while (!finishScreen.displayed()) {
      this.goNext();
    }
  },

  waitForLanguagesToLoad: function() {
    return this.client.waitFor(function() {
      return this.client.findElements(Ftu.Selectors.languageItems).length > 1;
    }.bind(this));
  },

  selectLanguage: function(language) {
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

      this.client.waitFor(function() {
        var docLang = this.client.executeScript(function() {
          return document.documentElement.lang;
        });
        return docLang === language;
      }.bind(this));

    } else {
      throw new Error('Option '+ language +
                      ' could not be found in select wrapper');
    }
  },

  getLocationHash: function() {
    var hash = this.client.executeScript(function() {
      return window.wrappedJSObject.location.hash;
    });
    return hash;
  },

  goNext: function() {
    var finishScreen = this.client.findElement(Ftu.Selectors.finishScreen);
    this.client.helper.waitForElementToDisappear('#loading-overlay');
    var button = this.client.helper.waitForElement(Ftu.Selectors.nextButton);
    this.client.waitFor(function() {
      return button.enabled;
    });
    var currentHash = this.getLocationHash();
    button.tap();
    this.client.waitFor(function() {
      return (
        finishScreen.displayed() ||
        currentHash !== this.getLocationHash()
      );
    }.bind(this));
  },

  tapTakeTour: function() {
    var button =
      this.client.helper.waitForElement(Ftu.Selectors.startTourButton);
    button.tap();
    this.client.helper.waitForElement(Ftu.Selectors.tourPanel);
  },

  tapTourNext: function() {
    var panel =
      this.client.helper.waitForElement(Ftu.Selectors.tourPanel);
    var currentStep = panel.getAttribute('data-step');
    var button =
      this.client.helper.waitForElement(Ftu.Selectors.tourNextButton);
    button.tap();
    this.client.waitFor(function() {
      return (
        (panel.getAttribute('data-step') != currentStep) ||
        this.isTourFinished()
      );
    }.bind(this));
  },

  isTourFinished: function() {
    var finishedPanels =
      this.client.findElements(Ftu.Selectors.tourFinishedPanels);
    return finishedPanels.some(function(panel) {
      return panel.displayed();
    });
  }
};

module.exports = Ftu;
