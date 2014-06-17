'use strict';
/* global module */

var System = require('../../../../../apps/system/test/marionette/lib/system');

/**
 * Abstraction around homescreen.
 * @constructor
 */
function Home2(client) {
  this.client = client;
  this.system = new System(client);
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
  dividers: '#icons div.divider',
  contextmenu: '#contextmenu-dialog',
  confirmMessageOk: '#confirmation-message-ok'
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
   * Clicks the confirm dialog primary action until it goes away.
   * The system app may be covering it up with some annoying dialog.
   */
  clickConfirm: function() {
    this.client.waitFor(function() {
      var confirm = this.client.helper.waitForElement(
        Home2.Selectors.confirmMessageOk);
      confirm.click();
      return !confirm.displayed();
    }.bind(this));
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
  Tap an app icon and switch to it's application iframe.

  @param {String} manifestURL full manifest url path.
  */
  launchAndSwitchToApp: function(manifestURL) {
    var client = this.client.scope({ searchTimeout: 100 });
    var frame;
    client.waitFor(function() {
      // switch back to the homescreen
      client.switchToFrame();
      client.switchToFrame(this.system.getHomescreenIframe());

      // tap the app in the homescreen
      var newApp = this.getIcon(manifestURL);
      newApp.click();

      // go to the system app
      client.switchToFrame();

      // wait for the app to show up
      try {
        frame = client.findElement(
          'iframe[mozapp="' + manifestURL + '"]'
        );
      } catch(e) {
        // try again...
        return false;
      }
      client.switchToFrame(frame);
      return true;
    }.bind(this));
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
    var client = this.client.scope({context: 'chrome'});

    var file = 'app://' + app + '.gaiamobile.org/manifest.webapp';
    var manifest = client.executeScript(function(file) {
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

  /**
   * Returns a localized string from a properties file.
   * @param {String} file to open.
   * @param {String} key of the string to lookup.
   */
  l10n: function(file, key) {
    var string = this.client.executeScript(function(file, key) {
      var xhr = new XMLHttpRequest();
      var data;
      xhr.open('GET', file, false); // Intentional sync
      xhr.onload = function(o) {
        data = JSON.parse(xhr.response);
      };
      xhr.send(null);
      return data;
    }, [file, key]);

    return string[key];
  },

  containsClass: function(selector, clazz) {
    return this.client.executeScript(function(selector, clazz) {
      return document.querySelector(selector).classList.contains(clazz);
    }, [selector, clazz]);
  }
};

module.exports = Home2;
