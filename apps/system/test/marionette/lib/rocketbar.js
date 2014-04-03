'use strict';
/* global module */

/**
 * A Marionette test harness for Rocketbar.
 */

var Marionette = require('marionette-client');

/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function Rocketbar(client) {
  this.client = client.scope({ searchTimeout: 200000 });
  this.actions = new Marionette.Actions(client);
}

module.exports = Rocketbar;

Rocketbar.clientOptions = {
  prefs: {
    // This is true on Gonk, but false on desktop, so override.
    'dom.inter-app-communication-api.enabled': true,
    'dom.w3c_touch_events.enabled': 1
  },
  settings: {
    'ftu.manifestURL': null,
    'keyboard.ftu.enabled': false,
    'lockscreen.enabled': false,
    'rocketbar.enabled': true
  }
};

Rocketbar.prototype = {
  selectors: {
    rocketbar: '#rocketbar',
    rocketbarInput: '#rocketbar-input'
  },

  /**
   * Tap the Rocketbar to show and focus input field.
   */
  focus: function() {
    var rocketbar = this.client.findElement(this.selectors.rocketbar);
    this.client.waitFor(rocketbar.displayed.bind(rocketbar));
    rocketbar.tap();
    var rocketbarInput = this.client.findElement(this.selectors.rocketbarInput);
    this.client.waitFor(rocketbarInput.displayed.bind(rocketbarInput));
  },

  /**
   * Send keys to the Rocketbar (needs to be focused first).
   */
  enterText: function(input) {
    var rocketbarInput = this.client.findElement(this.selectors.rocketbarInput);
    rocketbarInput.clear();
    this.client.waitFor(rocketbarInput.displayed.bind(rocketbarInput));
    rocketbarInput.sendKeys(input);
  },

  /**
   * Switch to a browser window frame which matches the given URL.
   */
  switchToBrowserFrame: function(url) {
    var browserFrame = this.client.findElement('iframe[src="' + url + '"]');
    this.client.switchToFrame(browserFrame);
  },

  /**
   * Wait for an opened browser frame to complete showing, then
   * return to the homescreen.
   */
  waitForBrowserFrame: function() {
    this.client.switchToFrame();
    this.client.waitFor((function() {
      var size = this.client.findElement('.appWindow.active').size();
      return size.width === 320 && size.height === 456;
    }).bind(this));
    return this.client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('home'));
    });
  }
};
