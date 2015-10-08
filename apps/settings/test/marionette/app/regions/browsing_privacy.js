'use strict';
var Base = require('../base');

/**
 * Abstraction around settings browsing privacy panel.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function BrowsingPrivacyPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, BrowsingPrivacyPanel.Selectors);

}

module.exports = BrowsingPrivacyPanel;

BrowsingPrivacyPanel.Selectors = {
  'trackingProtectionEnabledSwitch':
    '#browsingPrivacy gaia-switch[name="privacy.trackingprotection.enabled"]'
};

BrowsingPrivacyPanel.prototype = {

  __proto__: Base.prototype,

  get isTrackingProtectionEnabled() {
    return this.findElement('trackingProtectionEnabledSwitch')
      .scriptWith(function(el) {
        return el.wrappedJSObject.checked;
      });
  },

  enableTrackingProtection: function() {
    if (this.isTrackingProtectionEnabled) {
      return;
    }
    this.waitForElement('trackingProtectionEnabledSwitch').click();
    this.client.waitFor(function() {
      return this.isTrackingProtectionEnabled;
    }.bind(this));
  },

  disableTrackingProtection: function() {
    if (!this.isTrackingProtectionEnabled) {
      return;
    }
    this.waitForElement('trackingProtectionEnabledSwitch').click();
    this.client.waitFor(function() {
      return !this.isTrackingProtectionEnabled;
    }.bind(this));
  }

};
