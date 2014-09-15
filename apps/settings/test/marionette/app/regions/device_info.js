'use strict';
var Base = require('../base');

/**
 * Abstraction around settings media storage panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function DeviceInfoPanel(client) {
  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, DeviceInfoPanel.Selectors);
}


module.exports = DeviceInfoPanel;

DeviceInfoPanel.Selectors = {
  'moreInfoBtn': '#about button[data-l10n-id="more-info"]',
  'yourRightsBtn': '#about button[data-l10n-id="your-rights"]',
  'yourPrivacyBtn': '#about button[data-l10n-id="your-privacy"]',
  'legalInfoBtn': '#about button[data-l10n-id="about-legal-info"]',
  'resetPhoneBtn': '#about button#reset-phone',
  'resetPhoneDialog': '#reset-phone-dialog',
  'cancelResetPhoneBtn': '#cancel-reset-phone',
  'developerMenuCheckbox': 'input[name="developer.menu.enabled"]',
  'developerMenuLabel': 'span[data-l10n-id="developer-menu"]',
  'openSourceNoticesLink': 'a[href="#about-licensing"]',
  'obtainingSourceCodeLink': 'a[href="#about-source-code"]',
  'privacyLink': 'a.privacy-browserOS',
  'developerMenuItem': 'li > #menuItem-developer',
  'aboutPanel': '#about',
  'rootPanel': '#root',
  'header': 'gaia-header'
};

DeviceInfoPanel.prototype = {

  __proto__: Base.prototype,

  tapOnResetPhoneButton: function() {
    this.waitForElement('resetPhoneBtn').tap();
  },

  tapOnCancelResetPhoneButton: function() {
    this.waitForElement('cancelResetPhoneBtn').tap();
  },

  get isResetPhoneDialogVisible() {
    return this.findElement('resetPhoneDialog').displayed();
  },

  tapOnMoreInfoButton: function() {
    this.waitForElement('moreInfoBtn').tap();
  },

  tapOnYourRightsButton: function() {
    this.waitForElement('yourRightsBtn').tap();
  },

  tapOnYourPrivacyButton: function() {
    this.waitForElement('yourPrivacyBtn').tap();
  },

  tapOnPrivacyBrowserButton: function() {
    this.waitForElement('privacyLink').tap();
  },

  tapOnLegalInfoButton: function() {
    this.waitForElement('legalInfoBtn').tap();
  },

  tapOnOpenSourceNoticesButton: function() {
    this.waitForElement('openSourceNoticesLink').tap();
  },

  tapOnObtainingSourceCodeButton: function() {
    this.waitForElement('obtainingSourceCodeLink').tap();
  },

  triggerDevelopMenu: function() {
    this.waitForElement('developerMenuLabel').tap();
    this.client.waitFor(function() {
      return this.isDevelopMenuEnabled;
    }.bind(this));
  },

  get isDevelopMenuEnabled() {
    return this.findElement('developerMenuCheckbox')
      .getAttribute('checked');
  },

  tapMoreInfoBackBtn: function() {
    this.waitForElement('moreInfoBackBtn').tap();
    this.waitForElement('aboutPanel');
  },

  get isDeveloperMenuItemVisible() {
    return this.findElement('developerMenuItem').displayed();
  },

  tapBackBtn: function() {
    this.waitForElement('header').tap(25, 25);
  }
};
