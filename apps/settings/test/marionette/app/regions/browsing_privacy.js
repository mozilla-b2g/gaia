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
  'privateBrowsingSwitch':
    '#browsingPrivacy gaia-switch[name="browser.private.default"]',
  'trackingProtectionEnabledSwitch':
    '#browsingPrivacy gaia-switch[name="privacy.trackingprotection.enabled"]',
  'clearHistoryButton':
    '#browsingPrivacy .clear-history-button',
  'clearPrivateDataButton':
    '#browsingPrivacy .clear-private-data-button',
  'confirmDialog':
    '#settings-confirm-dialog',
  'confirmDialogCancel':
    '#settings-confirm-dialog button[type="reset"]',
  'confirmDialogSubmit':
    '#settings-confirm-dialog button[type="submit"]'
};

BrowsingPrivacyPanel.prototype = {

  __proto__: Base.prototype,

  get isPrivateBrowsingEnabled() {
    return this.findElement('privateBrowsingSwitch')
      .scriptWith(function(el) {
        return el.wrappedJSObject.checked;
      });
  },

  get isTrackingProtectionEnabled() {
    return this.findElement('trackingProtectionEnabledSwitch')
      .scriptWith(function(el) {
        return el.wrappedJSObject.checked;
      });
  },

  get confirmDialogShown() {
    return this.findElement('confirmDialog').displayed();
  },

  enablePrivateBrowsing: function() {
    if (this.isPrivateBrowsingEnabled) {
      return;
    }
    this.waitForElement('privateBrowsingSwitch').click();
    this.client.waitFor(function() {
      return this.isPrivateBrowsingEnabled;
    }.bind(this));
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
  },

  clickClearHistoryButton: function() {
    this.waitForElement('clearHistoryButton').click();
    this.client.waitFor(function() {
      return this.confirmDialogShown;
    }.bind(this));
  },

  clickClearPrivateDataButton: function() {
    this.waitForElement('clearPrivateDataButton').click();
    this.client.waitFor(function() {
      return this.confirmDialogShown;
    }.bind(this));
  },

  clickConfirmDialogCancel: function() {
    this.waitForElement('confirmDialogCancel').click();
    this.client.waitFor(function() {
      return !this.confirmDialogShown;
    }.bind(this));
  },

  clickConfirmDialogSubmit: function() {
    this.waitForElement('confirmDialogSubmit').click();
    this.client.waitFor(function() {
      return !this.confirmDialogShown;
    }.bind(this));
  }

};
