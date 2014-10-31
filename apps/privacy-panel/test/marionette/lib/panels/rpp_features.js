'use strict';

var Base = require('../base');

function AlaMainPanel(client) {
  Base.call(this, client);
}

module.exports = AlaMainPanel;

AlaMainPanel.prototype = {

  __proto__: Base.prototype,

  selectors: {
    rootPanel:      '#root',
    rppPanel:       '#rpp-main',
    featuresPanel:  '#rpp-features',
    registerForm:   '#rpp-register',
    registerPass1:  '#rpp-register .pass1',
    registerPass2:  '#rpp-register .pass2',
    registerSubmit: '#rpp-register .rpp-register-ok',
    lockInput:      '#rpp-features [name="rpp.lock.enabled"]',
    lockLabel:      '#rpp-features [data-l10n-id="remote-lock"]',
    ringInput:      '#rpp-features [name="rpp.ring.enabled"]',
    ringLabel:      '#rpp-features [data-l10n-id="remote-ring"]',
    locateInput:    '#rpp-features [name="rpp.locate.enabled"]',
    locateLabel:    '#rpp-features [data-l10n-id="remote-locate"]',
    alert:          '#rpp-features .overlay'
  },

  init: function() {
    this.launch();
    this.loadMainPanel();
    this.registerUser();
  },

  loadMainPanel: function() {
    this.client.findElement('#menu-item-rpp').tap();
    this.waitForPanelToDissapear(this.selectors.rootPanel);
  },

  registerUser: function() {
    this.typeNewPassphrase('mypassword');
    this.waitForPanelToDissapear(this.selectors.rppPanel);
  },

  typeNewPassphrase: function(passphrase) {
    this.client.findElement(this.selectors.registerPass1).sendKeys(passphrase);
    this.client.findElement(this.selectors.registerPass2).sendKeys(passphrase);
    this.client.findElement(this.selectors.registerSubmit).tap();
  },

  isFeaturesPanelDisplayed: function() {
    return this.client.findElement(this.selectors.featuresPanel).displayed();
  },

  isAlertDisplayed: function() {
    return this.client.findElement(this.selectors.alert).displayed();
  },

  isLockChecked: function() {
    return this.client.findElement(this.selectors.lockInput)
      .getAttribute('checked');
  },

  isRingChecked: function() {
    return this.client.findElement(this.selectors.ringInput)
      .getAttribute('checked');
  },

  isLocateChecked: function() {
    return this.client.findElement(this.selectors.locateInput)
      .getAttribute('checked');
  },

  isLockEnabled: function() {
    return this.client.settings.get('rpp.lock.enabled');
  },

  isRingEnabled: function() {
    return this.client.settings.get('rpp.ring.enabled');
  },

  isLocateEnabled: function() {
    return this.client.settings.get('rpp.locate.enabled');
  },

  tapBackBtn: function(panel) {
    this.client.findElement(panel + ' header .back').tap();
    this.waitForPanelToDissapear(panel);
  },

  tapOnLock: function() {
    this.client.findElement(this.selectors.lockLabel).tap();
  },

  tapOnRing: function() {
    this.client.findElement(this.selectors.ringLabel).tap();
  },

  tapOnLocate: function() {
    this.client.findElement(this.selectors.locateLabel).tap();
  }

};
