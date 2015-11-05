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
  'moreInfoBtn': '#about a[href="#about-moreInfo"]',
  'yourRightsBtn': '#about a[href="#about-yourRights"]',
  'yourPrivacyBtn': '#about a[href="#about-yourPrivacy"]',
  'legalInfoBtn': '#about a[href="#about-legal"]',
  'resetPhoneBtn': '#about button.reset-phone',
  'resetPhoneDialog': '.reset-phone-dialog',
  'cancelResetPhoneBtn': '.cancel-reset-phone',
  'developerMenuCheckbox': 'gaia-switch[name="developer.menu.enabled"]',
  'openSourceNoticesLink': 'a[href="#about-licensing"]',
  'obtainingSourceCodeLink': 'a[href="#about-source-code"]',
  'privacyLink': 'a.privacy-browserOS',
  'developerMenuItem': 'li > #menuItem-developer',
  'aboutPanel': '#about',
  'rootPanel': '#root',
  'deviceInfoBackBtn': '#about-moreInfo gaia-header',
  'openSourceNoticesBackBtn': '#about-licensing gaia-header'
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
    this.waitForElement('developerMenuCheckbox').click();
    this.client.waitFor(function() {
      return this.isDevelopMenuEnabled;
    }.bind(this));
  },

  get isDevelopMenuEnabled() {
    return this.findElement('developerMenuCheckbox')
      .scriptWith(function(el) {
        return el.wrappedJSObject.checked;
      });
  },

  tapMoreInfoBackBtn: function() {
    this.waitForElement('moreInfoBackBtn').tap();
    this.waitForElement('aboutPanel');
  },

  get isDeveloperMenuItemVisible() {
    return this.findElement('developerMenuItem').displayed();
  },

  tapDeviceInfoBackBtn: function() {
    this.waitForElement('deviceInfoBackBtn').tap(25, 25);
  },

  tapOpenSourceNoticesBackBtn: function() {
    this.waitForElement('openSourceNoticesBackBtn').tap(25, 25);
  }
};
