'use strict';
/* global module */

var assert = require('assert');

/**
 * Abstraction around search app.
 * @constructor
 */
function Search(client) {
  this.client = client;
}

/**
 * @type String Origin of search app
 */
Search.URL = 'app://search.gaiamobile.org';

Search.Selectors = {
  iframe: '#rocketbar-results-frame',
  firstAppContainer: '#localapps',
  firstApp: '#localapps div',
  firstContact: '#contacts div',
  firstContactContainer: '#contacts',
  firstPlace: '#places div .title',
  firstPlaceContainer: '#places'
};

Search.prototype = {

  /**
   * Navigates to the search results frame.
   */
  goToResults: function() {
    var iframe = this.client.findElement(Search.Selectors.iframe);
    this.client.helper.waitForElement(iframe);
    this.client.switchToFrame(iframe);
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
   * Navigates to a specific app/entry point
   * Waits for the body to be loaded
   */
  goToApp: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp.apply(this.client.apps, arguments);
    this.client.helper.waitForElement('body');
  }

};

module.exports = Search;
