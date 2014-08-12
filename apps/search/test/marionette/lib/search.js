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
  iframe: 'iframe[mozapptype="search"]',
  firstAppContainer: 'gaia-grid',
  firstApp: 'gaia-grid .icon',
  firstContact: '#contacts div',
  firstContactContainer: '#contacts',
  firstPlace: '#places div .title',
  firstPlaceContainer: '#places',
  firstRunConfirm: '#suggestions-notice-confirm'
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
   * Return selector for the grid item with a n identifier
   */
  getResultSelector: function(identifier) {
    return '.icon[data-identifier="' + identifier + '"]';
  },

  /**
   * Return grid results for a particular identifier
   */
  getResult: function(identifier) {
    var selector = '.icon[data-identifier="' + identifier + '"]';
    return this.client.findElements(selector);
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
   * Workaround for bug 1022768, where app permissions are not auto ALLOWed
   * for tests on desktop. If that bug is fixed, this function should be
   * removed.
   */
  removeGeolocationPermission: function() {
    var client = this.client.scope({ context: 'chrome' });
    client.executeScript(function(origin) {
      var mozPerms = navigator.mozPermissionSettings;
      mozPerms.set(
        'geolocation', 'deny', origin + '/manifest.webapp', origin, false
      );
    }, [Search.URL]);
  },

  /**
   * On first run a warning is shown to users on Search app configuration
   * trigger this notice and confirm it.
   */
  triggerFirstRun: function(rocketbar) {
    rocketbar.enterText('abc');
    this.goToResults();
    this.client.helper
      .waitForElement(Search.Selectors.firstRunConfirm)
      .click();
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
  }

};

module.exports = Search;
