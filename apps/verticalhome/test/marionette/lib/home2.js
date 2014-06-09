'use strict';
/* global module */

/**
 * Abstraction around homescreen.
 * @constructor
 */
function Home2(client) {
  this.client = client;
}

Home2.clientOptions = {
  prefs: {
    'dom.inter-app-communication-api.enabled': true,
    'dom.w3c_touch_events.enabled': 1
  },
  settings: {
    'homescreen.manifestURL':
      'app://verticalhome.gaiamobile.org/manifest.webapp',
    'ftu.manifestURL': null,
    'keyboard.ftu.enabled': false,
    'lockscreen.enabled': false,
    'rocketbar.enabled': false
  }
};

/**
 * @type String Origin of Home2 app
 */
Home2.URL = 'app://verticalhome.gaiamobile.org';

Home2.Selectors = {
  editHeaderText: '#edit-header h1',
  editHeaderDone: '#edit-header menu a',
  search: '#search',
  firstIcon: '#icons div.icon:not(.placeholder)',
  dividers: '#icons div.divider'
};

/**
 * Launches our new homescreen and focuses on it.
 */
Home2.prototype = {

  get numIcons() {
    return this.client.findElements(Home2.Selectors.firstIcon).length;
  },

  get numDividers() {
    return this.client.findElements(Home2.Selectors.dividers).length;
  },

  /**
   * Gets an icon by identifier.
   */
  getIconByIdentifier: function(identifier) {
    return this.client.helper.waitForElement(
      '[data-identifier="' + identifier + '"]'
    );
  },

  /**
   * Emulates pressing of the hardware home button.
   */
  pressHomeButton: function() {
    this.client.executeScript(function() {
      var home = new CustomEvent('home');
      window.dispatchEvent(home);
    });
  },

  /**
  Fetch an icon element on the homescreen.

  @param {String} manifestURL must be a fully qualified manifest url.
  @return {Marionette.Element}
  */
  getIcon: function(manifestUrl) {
    return this.client.helper.waitForElement(
      '[data-identifier="' + manifestUrl + '"]'
    );
  },

  /**
   * Waits for the homescreen to launch and switches to the frame.
   */
  waitForLaunch: function() {
    this.client.helper.waitForElement('body.homesearch-enabled');
    this.client.apps.switchToApp(Home2.URL);
  },

  /**
   * Gets a localized application name from a manifest.
   * @param {String} app to open
   * @param {String} locale
   */
  localizedAppName: function(app, locale) {
    this.client = this.client.scope({context: 'chrome'});

    var file = 'app://' + app + '.gaiamobile.org/manifest.webapp';
    var manifest = this.client.executeScript(function(file) {
      var xhr = new XMLHttpRequest();
      var data;
      xhr.open('GET', file, false); // Intentional sync
      xhr.onload = function(o) {
        data = JSON.parse(xhr.response);
      };
      xhr.send(null);
      return data;
    }, [file]);

    var locales = manifest.locales;
    return locales && locales[locale].name;
  },

  containsClass: function(selector, clazz) {
    return this.client.executeScript(function(selector, clazz) {
      return document.querySelector(selector).classList.contains(clazz);
    }, [selector, clazz]);
  }
};

module.exports = Home2;
