'use strict';
var Base = require('../base');

/**
 * Abstraction around settings browsing privacy panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function BrowsingPrivacyPanel(client) {
  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, BrowsingPrivacyPanel.Selectors);
}

module.exports = BrowsingPrivacyPanel;

BrowsingPrivacyPanel.Selectors = {
  'clearCookiesButton': 'button.clear-private-data-button'
};

BrowsingPrivacyPanel.prototype = {
  __proto__: Base.prototype,

  clearCookiesAndStoredData: function() {
    this.waitForElement('clearCookiesButton').tap();
  },

};
