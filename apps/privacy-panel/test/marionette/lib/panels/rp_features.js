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
    rpPanel:        '#rp-main',
    featuresPanel:  '#rp-features',
    registerForm:   '#rp-register',
    registerPass1:  '#rp-register .pass1',
    registerPass2:  '#rp-register .pass2',
    registerSubmit: '#rp-register .rp-register-ok',
    lockInput:      '#rp-features [name="rp.lock.enabled"]',
    lockLabel:      '#rp-features [data-l10n-id="remote-lock"]',
    ringInput:      '#rp-features [name="rp.ring.enabled"]',
    ringLabel:      '#rp-features [data-l10n-id="remote-ring"]',
    locateInput:    '#rp-features [name="rp.locate.enabled"]',
    locateLabel:    '#rp-features [data-l10n-id="remote-locate"]',
    alert:          '#rp-features .overlay'
  },

  init: function() {
    this.launch();
    this.loadMainPanel();
    this.registerUser();
  },

  loadMainPanel: function() {
    this.client.findElement('#menu-item-rp').tap();
    this.waitForPanelToDissapear(this.selectors.rootPanel);
  },

  registerUser: function() {
    this.typeNewPassphrase('mypassword');
    this.waitForPanelToDissapear(this.selectors.rpPanel);
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
      .scriptWith(function(el) {
        return el.wrappedJSObject.checked;
      });
  },

  isRingChecked: function() {
    return this.client.findElement(this.selectors.ringInput)
      .scriptWith(function(el) {
        return el.wrappedJSObject.checked;
      });
  },

  isLocateChecked: function() {
    return this.client.findElement(this.selectors.locateInput)
      .scriptWith(function(el) {
        return el.wrappedJSObject.checked;
      });
  },

  isLockEnabled: function() {
    return this.client.settings.get('rp.lock.enabled');
  },

  isRingEnabled: function() {
    return this.client.settings.get('rp.ring.enabled');
  },

  isLocateEnabled: function() {
    return this.client.settings.get('rp.locate.enabled');
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
    this.client.findElement(this.selectors.locateLabel).click();
  }

};
