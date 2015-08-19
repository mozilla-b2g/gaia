'use strict';
/* global module */

var assert = require('assert');

var PROVIDERS_VERSION = 3;
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
  allGridResults: 'gaia-grid .icon',
  iframe: 'iframe[mozapptype="search"]',
  firstAppContainer: 'gaia-grid',
  firstApp: 'gaia-grid .icon',
  firstContact: '#contacts div',
  firstContactContainer: '#contacts',
  firstPlace: '#places div .title',
  firstPlaceContainer: '#places',
  firstRunConfirm: '#suggestions-notice-confirm',
  privateWindow: '#private-window',
  topSites: '.top-site',
  historyResults: '#history .result',
  suggestions: '#suggestions li',
  switchProviders: '#suggestions-select'
};

Search.prototype = {

  URL: Search.URL,
  NEW_TAB_URL: Search.URL + '/newtab.html',
  Selectors: Search.Selectors,

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
   * Return selector for the grid item with a n identifier
   */
  getResultSelector: function(identifier) {
    return '.icon[data-identifier="' + identifier + '"]';
  },

  /**
   * Return selector for the history list item by URL
   */
  getHistoryResultSelector: function(url) {
    return '.result[data-url="' + url + '"]';
  },

  /**
   * Return grid results for a particular identifier
   */
  getResult: function(identifier) {
    var selector = '.icon[data-identifier="' + identifier + '"]';
    return this.client.findElements(selector);
  },

  getHistoryResults: function() {
    return this.client.findElements(Search.Selectors.historyResults);
  },

  getTopSites: function() {
    return this.client.findElements(Search.Selectors.topSites);
  },

  /**
   * Checks that we have a result for a given app in the results list.
   */
  checkResult: function(identifier, expected) {
    var selectors = Search.Selectors;
    var selector = '.icon[data-identifier*="' + identifier + '"]';

    this.client.helper.waitForElement(selectors.firstAppContainer);
    var result = this.client.helper.waitForElement(selector);
    assert.equal(expected, result.text());
    return result;
  },

  /**
   * Counts all grid search results.
   */
  countGridResults: function() {
    return this.client.findElements(Search.Selectors.allGridResults).length;
  },

  /**
   * On first run a warning is shown to users on Search app configuration
   * trigger this notice and confirm it.
   */
  triggerFirstRun: function(rocketbar) {
    rocketbar.enterText('a');
    this.goToResults();

    this.client.executeScript(function() {
      window.wrappedJSObject.Search.toShowNotice = false;
    });

    this.client.switchToFrame();
    rocketbar.enterText('');
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

  searchDataVersion: function() {
    return PROVIDERS_VERSION;
  },

  /**
   * Gets a reference to the provider select using findElement.
   * This waits for the element to be available, but not visible on the apge.
   */
  get switchProvidersSelect() {
    // Fail finding elements quickly.
    var quickly = this.client.scope({
      searchTimeout: 20
    });

    var element;

    try {
      element = quickly.findElement(Search.Selectors.switchProviders);
    } catch(e) {
      return this.switchProvidersSelect;
    }

    return element;
  },

};

module.exports = Search;
