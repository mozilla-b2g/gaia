var assert = require('assert');

/**
 * Abstraction around search app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Search(client) {
  this.client = client;
}

/**
 * @type String Origin of search app
 */
Search.URL = 'app://search.gaiamobile.org';

Search.ClientOptions = {
  prefs: {
    // This is true on Gonk, but false on desktop, so override.
    'dom.inter-app-communication-api.enabled': true
  },
  settings: {
    'ftu.manifestURL': null,
    'keyboard.ftu.enabled': false,
    'lockscreen.enabled': false,
    'rocketbar.enabled': true
  }
};

Search.Selectors = {
  searchInput: '#search-input',
  searchResults: 'iframe[mozapptype="mozsearch"]',
  statusBar: '#statusbar',
  firstApp: '[data-provider="LocalApps"]',
  firstContact: '[data-provider="Contacts"]'
};

Search.prototype = {

  /**
   * Launches search app and focuses on frame.
   */
  launch: function() {
    this.client.apps.launch(Search.URL);
    this.client.apps.switchToApp(Search.URL);
    this.client.helper.waitForElement('body');
  },

  /**
   * Checks that the text of a selector matches the expected result.
   * Clicks on that result.
   * @param {String} selectorKey from Search.Selectors.
   * @param {String} expected value of the text.
   */
  checkResult: function(selectorKey, expected) {
    var result = this.client.helper
      .waitForElement(Search.Selectors[selectorKey]);
    assert.equal(expected, result.text());
    result.click();
  },

  /**
   * Opens the rocketbar and enters text
   */
  doSearch: function(input) {
    this.openRocketbar();
    this.client.helper
      .waitForElement(Search.Selectors.searchInput)
      .sendKeys(input);
  },

  /**
   * Navigates to a specific app/entry point
   * Waits for the body to be loaded
   */
  goToApp: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp.apply(this.client.apps, arguments);
    this.client.helper.waitForElement('body');
  },

  /**
   * Navigates to the search results frame
   */
  goToResults: function() {
    var resultsFrame = this.client.helper
      .waitForElement(Search.Selectors.searchResults);
    this.client.switchToFrame(resultsFrame);
  },

  /**
   * Navigates to a browser by finding the iframe
   * which matches the given url.
   */
  goToBrowser: function(url) {
    var browserFrame = this.client.helper
      .waitForElement('iframe[src="' + url + '"]');
    this.client.switchToFrame(browserFrame);
  },

  /**
   * Opens the rocketbar
   */
  openRocketbar: function() {
    // Once we have real touch events we can use a gesture
    this.client.executeScript(function() {
      window.wrappedJSObject.Rocketbar.render();
    });

    this.client.waitFor(function() {
      var location = this.client
        .findElement(Search.Selectors.searchInput).location();
      return location.y >= 20;
    }.bind(this));
  }
};

module.exports = Search;
