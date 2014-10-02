'use strict';
/* global module */

var System = require('../../../../../apps/system/test/marionette/lib/system');
var Actions = require('marionette-client').Actions;
var getIconId = require('./icon_id');

/**
 * Abstraction around homescreen.
 * @constructor
 */
function Home2(client) {
  this.client = client;
  this.system = new System(client);

  // For all home2 tests we disable geolocation for smart collections because
  // there is a nasty bug where we show a prompt on desktop but not a device.
  // This will go away once bug 1022768 lands.
  var chromeClient = this.client.scope({ context: 'chrome' });
  chromeClient.executeScript(function() {
    var origin = 'app://collection.gaiamobile.org';
    var mozPerms = navigator.mozPermissionSettings;
    mozPerms.set(
      'geolocation', 'deny', origin + '/manifest.webapp', origin, false
    );
  });
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
    'lockscreen.enabled': false
  }
};

Home2.clientOptionsWithGroups = {
  prefs: Home2.clientOptions.prefs,
  settings: {
    'verticalhome.grouping.enabled': true
  }
};

Object.keys(Home2.clientOptions.settings).forEach(function(prop) {
  Home2.clientOptionsWithGroups.settings[prop] = 
                                Home2.clientOptions.settings[prop];
});

/**
 * @type String Origin of Home2 app
 */
Home2.URL = 'app://verticalhome.gaiamobile.org';

Home2.Selectors = {
  editHeaderText: '#edit-header h1',
  editHeaderDone: '#exit-edit-mode',
  editGroup: '#edit-group',
  editGroupTitle: '#edit-group-title',
  editGroupSave: '#edit-group-save',
  editGroupTitleClear: '#edit-group-title-clear',
  search: '#search',
  firstIcon: '#icons div.icon:not(.placeholder)',
  groupHeader: '#icons .group .header',
  groupTitle: '#icons .group .header .title',
  dividers: '#icons section.divider',
  contextmenu: '#contextmenu-dialog',
  themeColor: 'head meta[name="theme-color"]'
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
  Fetch a particular type of a gaia-confirm dialog.

  @param {String} type of dialog.
  */
  getConfirmDialog: function(type) {
    var selector = 'gaia-confirm[data-type="' + type + '"]';
    return this.client.helper.waitForElement(selector);
  },

  /**
  Click confirm on a particular type of confirmation dialog.

  @param {String} type of dialog.
  @param {String} selector of the button. Defaults to .confirm.
  */
  confirmDialog: function(type, button) {
    var dialog = this.getConfirmDialog(type);
    var confirm = dialog.findElement(button || '.confirm');

    // XXX: Hack to use faster polling
    var quickly = this.client.scope({ searchTimeout: 50 });
    confirm.client = quickly;

    // tricky logic to ensure the dialog has been removed and clicked
    this.client.waitFor(function() {
      try {
        // click the dialog to dismiss it
        confirm.click();
        // ensure it is either hidden or hits the stale element ref
        return !confirm.displayed();
      } catch (e) {
        if (e.type === 'StaleElementReference') {
          // element was successfully removed
          return true;
        }
        throw e;
      }
    });
  },

  /**
   * Enter edit mode by long pressing a given icon, or the first icon on the
   * grid if not specified.
   */
  enterEditMode: function(icon) {
    var actions = new Actions(this.client);
    var firstIcon = icon ||
      this.client.helper.waitForElement(Home2.Selectors.firstIcon);

    actions.longPress(firstIcon, 1).perform();
    this.client.helper.waitForElement(Home2.Selectors.editHeaderText);
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

  focusRocketBar: function() {
    this.client.helper.waitForElement(Home2.Selectors.search).tap();
    this.client.switchToFrame();
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
      newApp.tap();

      // go to the system app
      client.switchToFrame();

      // wait for the app to show up
      try {
        frame = client.findElement(
          'iframe[mozapp="' + manifestURL + '"]'
        );
      } catch (e) {
        // try again...
        return false;
      }
      client.switchToFrame(frame);
      return true;
    }.bind(this));
  },

  /**
  Restart the homescreen then refocus on it.
  */
  restart: function() {
    this.client.executeScript(function() {
      window.close();
    });

    // initialize our frames again since we killed the iframe
    this.client.switchToFrame();
    this.client.switchToFrame(this.system.getHomescreenIframe());
  },

  /**
  Find and return every id for all the items on the grid... Each element
  can be used with `.getIcon` to find the element for a given id.

  @return {Array[String]}
  */
  getIconIdentifiers: function() {
    return this.client.findElements('[data-identifier]').map(function(el) {
      return getIconId(el);
    });
  },

  /**
  Fetch an icon element on the homescreen.

  @param {String} manifestURL must be a fully qualified manifest url.
  @return {Marionette.Element}
  */
  getIcon: function(manifestUrl, entryPoint) {
    return this.client.helper.waitForElement(
      '[data-identifier*="' + manifestUrl +
      (entryPoint ? '-' + entryPoint : '') + '"]'
    );
  },

  /**
  Get the the current meta=theme-color of the homescreen

  @return {String}
  */
  getThemeColor: function() {
    var meta = this.client.findElement(Home2.Selectors.themeColor);
    return meta.getAttribute('content');
  },

  /**
   * Waits for the homescreen to launch and switches to the frame.
   */
  waitForLaunch: function() {
    this.client.helper.waitForElement('body');
    this.client.apps.switchToApp(Home2.URL);
  },

  /**
   * Gets a localized application name from a manifest.
   * @param {String} app to open
   * @param {String} entryPoint to open
   * @param {String} locale
   */
  localizedAppName: function(app, entryPoint, locale) {
    if (!locale) {
      locale = entryPoint;
      entryPoint = null;
    }

    var client = this.client.scope({context: 'chrome'});

    var file = 'app://' + app + '.gaiamobile.org/manifest.webapp';
    var manifest = client.executeAsyncScript(function(file) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', file, true);
      xhr.onload = function(o) {
        var data = JSON.parse(xhr.response);
        marionetteScriptFinished(data);
      };
      xhr.send(null);
    }, [file]);

    var locales;
    if (entryPoint) {
      locales = manifest.entry_points[entryPoint].locales;
    } else {
      locales = manifest.locales;
    }
    return locales && locales[locale].name;
  },

  /**
   * Returns a localized string from a properties file.
   * @param {String} file to open.
   * @param {String} key of the string to lookup.
   */
  l10n: function(file, key) {
    var string = this.client.executeAsyncScript(function(file, key) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', file, true);
      xhr.onload = function(o) {
        var data = JSON.parse(xhr.response);
        marionetteScriptFinished(data);
      };
      xhr.send(null);
    }, [file, key]);

    return string[key];
  },

  containsClass: function(selector, clazz) {
    return this.client.executeScript(function(selector, clazz) {
      return document.querySelector(selector).classList.contains(clazz);
    }, [selector, clazz]);
  },

  /**
   * Waits for the system banner to go away and switches back to the homescreen
   */
  waitForSystemBanner: function() {
    this.client.switchToFrame();
    var banner = this.client.findElement('.banner.generic-dialog');
    this.client.helper.waitForElementToDisappear(banner);
    this.client.switchToFrame(this.system.getHomescreenIframe());
  },

  /**
   * Helper function to move an icon to a specified index. Currently uses
   * executeScript() and manually fiddles with the homescreen grid logic,
   * this is because scripted drag/drop does not work too well within the
   * vertically scrolling homescreen on b2g desktop.
   * @param {Element} icon The grid icon object.
   * @param {Integer} index The position to insert the icon into.
   */
  moveIconToIndex: function(icon, index) {
    this.client.executeScript(function(identifier, newPos) {
      var app = window.wrappedJSObject.app;
      var icon = app.grid.getIcon(identifier);
      app.grid.moveTo(icon.detail.index, newPos);
      app.grid.render();
    }, [icon.getAttribute('data-identifier'), index]);

    // Wait for the icon to animate into place
    var actions = new Actions(this.client);
    actions.wait(1).perform();
  }
};

module.exports = Home2;
