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
  this.system = client.loader.getAppClass('system');
}

module.exports = Rocketbar;

Rocketbar.prototype = {
  selectors: {
    activeBrowserFrame: '.browser.appWindow.active',
    screen: '#screen',
    rocketbar: '#rocketbar',
    title: '#rocketbar-title',
    input: '#rocketbar-input',
    cancel: '#rocketbar-cancel',
    clear: '#rocketbar-clear',
    backdrop: '#rocketbar-backdrop',
    results: '#rocketbar-results',
    appTitle: '.appWindow.active .chrome .title'
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
        return win.Service.query('Rocketbar.enabled');
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
   * Focuses the rocketbar from the homescreen.
   * This is a temporary method while the homescreen search trigger lives in
   * the homescreen app. If we move it to the system app we can remove this.
   */
  homescreenFocus: function() {
    // Only verticalhome has a search bar built in, so check to see if the
    // app one is visible first and use that.
    var title;
    this.client.switchToFrame();
    try {
      title = this.client.scope({ searchTimeout: 100 }).
        findElement(this.selectors.appTitle);
    } catch (e) { }
    if (title && title.displayed()) {
      title.tap();
      this.client.switchToFrame();
      return;
    }

    this.client.switchToFrame();
    var homeLib = this.client.loader.getAppClass('verticalhome');
    homeLib.waitForLaunch();
    homeLib.focusRocketBar();
  },

  performSearchInBrowser: function(text) {
    this.enterText(text, true);
    this.waitForBrowserFrame();
  },

  /**
   * Trigger rocketbar from app title.
   */
  appTitleFocus: function() {
    var title = this.client.helper.waitForElement(this.selectors.appTitle);
    title.click();
  },

  waitForInputToBecomeVisible: function() {
    this.client.helper.waitForElement(this.selectors.input);
  },

  /**
   * Send keys to the Rocketbar (needs to be focused first).
   */
  enterText: function(text, submit) {
    var input =
      this.client.findElement(this.selectors.input);
    input.clear();
    this.client.waitFor(input.displayed.bind(input));
    input.sendKeys(text);

    if (submit) {
      input.sendKeys('\uE006');
    }

    if (!text.length) {
      this.client.executeScript(function() {
        window.wrappedJSObject.Service.request('Rocketbar:handleInput');
      });
    }

    // Manually blur the input with script or the keyboard can mess up
    // visibility in tests.
    input.scriptWith(function(el) {
      el.blur();
    });
  },

  /**
   * Switches to a search browser frame.
   * The URL of a search provider will generally contain '{searchTerms}', so
   * we replace that with the search text.
   */
  switchToSearchFrame: function(url, text) {
    url = url.replace('{searchTerms}', '');
    return this.switchToBrowserFrame(url);
  },

  /**
   * Switch to a browser window frame which matches the given URL.
   */
  switchToBrowserFrame: function(url) {
    url = url.replace(/\s+/g, '%20');
    var browserFrame = this.client.findElement('iframe[src*="' + url + '"]');
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
   * Wait for an opened browser frame to complete showing
   */
  waitForBrowserFrame: function() {
    this.client.switchToFrame();
    var browser = this.selectors.activeBrowserFrame;
    this.client.helper.waitForElement(browser);
  },

  goToURL: function(url) {
    this.homescreenFocus();
    this.enterText(url, true);
    this.system.waitForUrlLoaded(url);
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

  get clear() {
    return this.client.findElement(this.selectors.clear);
  },

  get backdrop() {
    return this.client.findElement(this.selectors.backdrop);
  }
};
