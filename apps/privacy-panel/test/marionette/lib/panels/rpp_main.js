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
    loginForm:      '#rpp-login',
    loginPass:      '#rpp-login .pass1',
    loginSubmit:    '#rpp-login .rpp-login-ok',
    registerForm:   '#rpp-register',
    registerPass1:  '#rpp-register .pass1',
    registerPass2:  '#rpp-register .pass2',
    registerSubmit: '#rpp-register .rpp-register-ok'
  },

  init: function() {
    this.launch();
    this.loadMainPanel();
  },

  loadMainPanel: function() {
    this.client.findElement('#menu-item-rpp').tap();
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
    this.client.findElement(panel + ' header .back').tap();
    this.waitForPanelToDissapear(panel);
  }

};
