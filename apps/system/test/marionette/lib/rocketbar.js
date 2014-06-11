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
    activeBrowserFrame: '#windows .appWindow.active',
    screen: '#screen',
    rocketbar: '#rocketbar',
    title: '#rocketbar-title',
    input: '#rocketbar-input',
    cancel: '#rocketbar-cancel',
    backdrop: '#rocketbar-backdrop',
    results: '#rocketbar-results'
  },

  /**
   * Tap the Rocketbar to show and focus input field.
   */
  focus: function() {
    var rocketbar = this.client.findElement(this.selectors.rocketbar);
    this.client.waitFor(rocketbar.displayed.bind(rocketbar));

    // Poll the page to ensure rocketbar is enabled before tapping on it.
    var lastVal = false;
    this.client.waitFor(function() {
      this.client.executeScript(function() {
        var win = window.wrappedJSObject;
        return win.rocketbar && win.rocketbar.enabled;
      }, function(err, value) {
        lastVal = value;
      });
      return lastVal;
    }.bind(this));

    rocketbar.tap();
    var input =
      this.client.findElement(this.selectors.input);
    this.client.waitFor(input.displayed.bind(input));
  },

  /**
   * Send keys to the Rocketbar (needs to be focused first).
   */
  enterText: function(text) {
    var input =
      this.client.findElement(this.selectors.input);
    input.clear();
    this.client.waitFor(input.displayed.bind(input));
    input.sendKeys(text);
  },

  /**
   * Switch to a browser window frame which matches the given URL.
   */
  switchToBrowserFrame: function(url) {
    var browserFrame = this.client.findElement('iframe[src="' + url + '"]');
    this.client.switchToFrame(browserFrame);
  },

  /**
   * Wait for Rocketbar to initialise and expand.
   */
  waitForLoad: function() {
    var element = this.rocketbar;
    this.client.waitFor(function() {
      var rocketbarClass = element.getAttribute('class');
      return rocketbarClass.indexOf('expanded') != -1;
    });
  },

  /**
   * Wait for an opened browser frame to complete showing, then
   * return to the homescreen.
   */
  waitForBrowserFrame: function() {
    this.client.switchToFrame();
    this.client.waitFor((function() {
      var size = this.client.findElement(this.selectors.activeBrowserFrame)
        .size();
      return size.width === 320 && size.height === 456;
    }).bind(this));
    return this.client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('home'));
    });
  },

  get rocketbar() {
    return this.client.findElement(this.selectors.rocketbar);
  },

  get results() {
    return this.client.findElement(this.selectors.results);
  },

  get screen() {
    return this.client.findElement(this.selectors.screen);
  },

  get title() {
    return this.client.findElement(this.selectors.title);
  },

  get input() {
    return this.client.findElement(this.selectors.input);
  },

  get cancel() {
    return this.client.findElement(this.selectors.cancel);
  },

  get backdrop() {
    return this.client.findElement(this.selectors.backdrop);
  }
};
