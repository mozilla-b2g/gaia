'use strict';

var Base = require('../base');

function RpMainPanel(client) {
  Base.call(this, client);
}

module.exports = RpMainPanel;

RpMainPanel.prototype = {

  __proto__: Base.prototype,

  selectors: {
    rootPanel:      '#root',
    rpPanel:        '#rp-main',
    featuresPanel:  '#rp-features',
    loginForm:      '#rp-login',
    loginPass:      '#rp-login .pass1',
    loginSubmit:    '#rp-login .rp-login-ok',
    registerForm:   '#rp-register',
    registerPass1:  '#rp-register .pass1',
    registerPass2:  '#rp-register .pass2',
    registerSubmit: '#rp-register .rp-register-ok'
  },

  init: function() {
    this.launch();
    this.loadMainPanel();
  },

  loadMainPanel: function() {
    this.client.findElement('#menu-item-rp').tap();
    this.waitForPanelToDissapear(this.selectors.rootPanel);
  },

  isRegisterFormDisplayed: function() {
    return this.client.findElement(this.selectors.registerForm).displayed();
  },

  isLoginFormDisplayed: function() {
    return this.client.findElement(this.selectors.loginForm).displayed();
  },

  typePassphrase: function(passphrase) {
    this.client.findElement(this.selectors.loginPass).sendKeys(passphrase);
    this.client.findElement(this.selectors.loginSubmit).tap();
  },

  typeNewPassphrase: function(passphrase) {
    this.client.findElement(this.selectors.registerPass1).sendKeys(passphrase);
    this.client.findElement(this.selectors.registerPass2).sendKeys(passphrase);
    this.client.findElement(this.selectors.registerSubmit).tap();
  },

  isFeaturesPanelDisplayed: function() {
    return this.client.findElement(this.selectors.featuresPanel).displayed();
  },

  tapBackBtn: function(panel) {
    this.client.findElement(panel + ' gaia-header ').tap(25, 25);
    this.waitForPanelToDissapear(panel);
  }

};
