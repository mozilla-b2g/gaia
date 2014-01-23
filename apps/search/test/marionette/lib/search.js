var Actions = require('marionette-client').Actions;
var assert = require('assert');

/**
 * Abstraction around search app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Search(client) {
  this.actions = new Actions(client);
  this.client = client;
  this.client.setSearchTimeout(10000);
}

/**
 * @type String Origin of search app
 */
Search.URL = 'app://search.gaiamobile.org';

Search.ClientOptions = {
  prefs: {
    // This is true on Gonk, but false on desktop, so override.
    'dom.inter-app-communication-api.enabled': true,
    'dom.w3c_touch_events.enabled': 1
  },
  settings: {
    'ftu.manifestURL': null,
    'keyboard.ftu.enabled': false,
    'lockscreen.enabled': false,
    'rocketbar.enabled': true
  }
};

Search.Selectors = {
  homescreen: '#homescreen',
  searchBar: '#search-bar',
  searchCancel: '#search-cancel',
  searchInput: '#search-input',
  searchResults: 'iframe[mozapptype="mozsearch"]',
  statusBar: '#statusbar',
  firstAppContainer: '#localapps',
  firstApp: '#localapps div',
  firstContact: '#contacts div',
  firstContactContainer: '#contacts',
  firstPlace: '#places div .title',
  firstPlaceContainer: '#places'
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
    var selectors = Search.Selectors;

    this.client.helper.waitForElement(selectors[selectorKey + 'Container']);
    var result = this.client.helper
      .waitForElement(selectors[selectorKey]);
    assert.equal(expected, result.text());
    result.click();
  },

  /**
   * Opens the rocketbar and enters text
   */
  doSearch: function(input) {
    this.client.switchToFrame();
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
    var selectors = Search.Selectors;

    this.client.helper.waitForElement(selectors.homescreen);
    this.client.executeScript(function() {
      window.wrappedJSObject.Rocketbar.render();
    });

    // https://bugzilla.mozilla.org/show_bug.cgi?id=960098
    // Renable and write a dedicated test for opening the rocketbar
    // be swiping from the statusbar down, this is currently broken.
    //
    // this.client.helper.waitForElement(selectors.homescreen);
    // var statusbar = this.client.helper.waitForElement(
    //  selectors.statusBar);
    // this.actions.flick(statusbar, 1, 1, 20, 200).perform();

    this.client.waitFor(function() {
      var location = this.client
        .findElement(Search.Selectors.searchInput).location();
      return location.y >= 20;
    }.bind(this));
  },

  /**
   * Wait for an opened browser frame to complete showing, then
   * return to the homescreen
   */
  waitForBrowserFrame: function() {
    this.client.switchToFrame();
    this.client.waitFor((function() {
      var size = this.client.findElement('.appWindow.active').size();
      return size.width === 320 && size.height === 460;
    }).bind(this));
    return this.client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('home'));
    });
  },

  /**
   * Closes the rocketbar by pressing the cancel button
   */
  cancelRocketbar: function() {
    this.client.helper.waitForElement(Search.Selectors.searchCancel)
      .click();

    this.client.waitFor(function() {
      var el = this.client
        .findElement(Search.Selectors.searchBar);
      return el.location().y + el.size().height === 0;
    }.bind(this));
  }
};

module.exports = Search;
